import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPgPool } from "../../../lib/pg";
import {
  isDatabaseUnavailableError,
  noteDatabaseFailure,
} from "../../../lib/dbGuard";
import { isValidPhoneNumber } from "../../../lib/phoneValidation";
import { syncCompetitionRecordToFirestore } from "../../../../portal/lib/competitionRealtimeSync";
import { getFirestore } from "../../../../portal/lib/firebase-admin";

const COMPETITIONS = new Set([
  "3X3_MEN",
  "3X3_WOMEN",
  "KING_QUEEN",
  "KING",
  "QUEEN",
  "JACK_OF_THE_COURT",
  "THREE_POINT_MEN",
  "DUNK_CONTEST",
]);

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalText(value: unknown): string | null {
  const text = cleanText(value);
  return text || null;
}

function parseAge(value: unknown): number | null {
  if (value === null || value === undefined || cleanText(value) === "")
    return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99) return null;
  return Math.round(parsed);
}

type TeamPlayer = {
  name: string;
  age: number;
  jerseySize: string;
};

function parseTeamPlayers(value: unknown, configuredJerseySizes: string[]): TeamPlayer[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 4) return null;

  const players: TeamPlayer[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const player = entry as Record<string, unknown>;
    const name = cleanText(player.name);
    const age = parseAge(player.age);
    const selectedSize = cleanText(player.jerseySize);
    const jerseySize = configuredJerseySizes.find(
      (size) => size.toUpperCase() === selectedSize.toUpperCase(),
    );
    if (!name || !age || age < 5 || !jerseySize) return null;
    players.push({ name, age, jerseySize });
  }
  return players;
}

function defaultCompetitionRate(competitionType: string): number {
  return competitionType === "3X3" ||
    competitionType === "3X3_MEN" ||
    competitionType === "3X3_WOMEN"
    ? 50
    : 25;
}

async function syncLandingCompetitionToFirestore(input: {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  competitionType: string;
  participantName: string | null;
  age: number | null;
  gender: string | null;
  customerPhone: string;
  jerseySize: string | null;
  teamName: string | null;
  playerOne: string | null;
  playerTwo: string | null;
  playerThree: string | null;
  playerFour: string | null;
  players: TeamPlayer[];
  amountDue: number;
}) {
  try {
    const now = new Date();
    const firestore = getFirestore();
    await syncCompetitionRecordToFirestore({
      firestore,
      registration: {
        ...input,
        isPaid: false,
        amountDue: input.amountDue,
        amountPaid: null,
        paymentMethod: null,
        paidAt: null,
        source: "WEBSITE",
        status: "NEW",
        createdAt: now,
        updatedAt: now,
        deleted: false,
      },
    });
  } catch (error) {
    console.warn("[competition-registrations] firestore sync skipped", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventId = optionalText(body.eventId);
    let competitionType = cleanText(body.competitionType).toUpperCase();
    let eventTitle: string | null = null;
    let jerseySize: string | null = null;
    let configuredTournamentOptions: string[] = [];
    let configuredJerseySizes: string[] = [];

    if (eventId) {
      const eventResult = await getPgPool().query(
        `
        SELECT "title", "registrationEnabled", "tournamentOptions", "jerseySizes"
        FROM "Event"
        WHERE "id" = $1 AND "highlight" = true
        LIMIT 1
        `,
        [eventId],
      );
      const configuredEvent = eventResult.rows[0] as Record<string, unknown> | undefined;
      if (!configuredEvent || configuredEvent.registrationEnabled !== true) {
        return NextResponse.json(
          { error: "Registration is not open for this event." },
          { status: 400 },
        );
      }
      eventTitle = cleanText(configuredEvent.title);
      configuredTournamentOptions = Array.isArray(configuredEvent.tournamentOptions)
        ? configuredEvent.tournamentOptions.map(cleanText).filter(Boolean)
        : [];
      configuredJerseySizes = Array.isArray(configuredEvent.jerseySizes)
        ? configuredEvent.jerseySizes.map(cleanText).filter(Boolean)
        : [];
      const selectedTournament = configuredTournamentOptions.find(
        (option) => option.toUpperCase() === competitionType,
      );
      if (!selectedTournament) {
        return NextResponse.json(
          { error: "Please choose an available 3x3 tournament division." },
          { status: 400 },
        );
      }
      competitionType = selectedTournament;
    } else if (!COMPETITIONS.has(competitionType)) {
      return NextResponse.json(
        { error: "Please choose a competition." },
        { status: 400 },
      );
    }
    const customerPhone = cleanText(body.customerPhone);
    const phoneValidation = isValidPhoneNumber(customerPhone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        {
          error: phoneValidation.error || "Please enter a valid phone number.",
        },
        { status: 400 },
      );
    }

    let participantName: string | null = null;
    let age: number | null = null;
    let gender: string | null = null;
    let teamName: string | null = null;
    let playerOne: string | null = null;
    let playerTwo: string | null = null;
    let playerThree: string | null = null;
    let playerFour: string | null = null;
    let players: TeamPlayer[] = [];

    if (eventId) {
      teamName = optionalText(body.teamName);
      const parsedPlayers = parseTeamPlayers(body.players, configuredJerseySizes);
      if (!teamName) {
        return NextResponse.json(
          { error: "Team name is required." },
          { status: 400 },
        );
      }
      if (!parsedPlayers) {
        return NextResponse.json(
          { error: "Add 3 or 4 players with a valid name, age, and jersey size for each player." },
          { status: 400 },
        );
      }
      players = parsedPlayers;
      [playerOne, playerTwo, playerThree, playerFour = null] = players.map((player) => player.name);
      const normalizedDivision = competitionType.toUpperCase();
      if (/WOMEN|GIRL|FEMALE/.test(normalizedDivision)) gender = "FEMALE";
      else if (/MEN|BOY|MALE/.test(normalizedDivision)) gender = "MALE";
    } else if (competitionType === "3X3_MEN" || competitionType === "3X3_WOMEN") {
      teamName = optionalText(body.teamName);
      playerOne = optionalText(body.playerOne);
      playerTwo = optionalText(body.playerTwo);
      playerThree = optionalText(body.playerThree);
      playerFour = optionalText(body.playerFour);
      if (competitionType === "3X3_MEN") gender = "MALE";
      if (competitionType === "3X3_WOMEN") gender = "FEMALE";
      if (!teamName || !playerOne || !playerTwo || !playerThree) {
        return NextResponse.json(
          { error: "Team name and the first 3 player names are required." },
          { status: 400 },
        );
      }
    } else {
      participantName = optionalText(body.participantName);
      age = parseAge(body.age);
      if (!participantName || !age) {
        return NextResponse.json(
          { error: "Name and age are required." },
          { status: 400 },
        );
      }

      if (competitionType === "KING") {
        gender = "MALE";
      } else if (competitionType === "QUEEN") {
        gender = "FEMALE";
      } else if (
        competitionType === "KING_QUEEN" ||
        competitionType === "JACK_OF_THE_COURT"
      ) {
        gender = cleanText(body.gender).toUpperCase();
        if (gender !== "MALE" && gender !== "FEMALE") {
          return NextResponse.json(
            { error: "Please choose male or female." },
            { status: 400 },
          );
        }
      } else if (competitionType === "THREE_POINT_MEN") {
        gender = "MALE";
      }
    }

    const id = randomUUID();
    const amountDue = eventId ? 50 : defaultCompetitionRate(competitionType);
    await getPgPool().query(
      `
      INSERT INTO "CompetitionRegistration" (
        "id",
        "eventId",
        "eventTitle",
        "competitionType",
        "participantName",
        "age",
        "gender",
        "customerPhone",
        "jerseySize",
        "teamName",
        "playerOne",
        "playerTwo",
        "playerThree",
        "playerFour",
        "players",
        "amountDue",
        "source",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'WEBSITE', 'NEW', NOW(), NOW())
      `,
      [
        id,
        eventId,
        eventTitle,
        competitionType,
        participantName,
        age,
        gender,
        customerPhone,
        jerseySize,
        teamName,
        playerOne,
        playerTwo,
        playerThree,
        playerFour,
        JSON.stringify(players),
        amountDue,
      ],
    );

    await syncLandingCompetitionToFirestore({
      id,
      eventId,
      eventTitle,
      competitionType,
      participantName,
      age,
      gender,
      customerPhone,
      jerseySize,
      teamName,
      playerOne,
      playerTwo,
      playerThree,
      playerFour,
      players,
      amountDue,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    noteDatabaseFailure("competition-registrations.POST", error);
    console.error("[competition-registrations] error", error);
    return NextResponse.json(
      { error: "Unable to save registration. Please try again or contact us." },
      { status: isDatabaseUnavailableError(error) ? 503 : 500 },
    );
  }
}
