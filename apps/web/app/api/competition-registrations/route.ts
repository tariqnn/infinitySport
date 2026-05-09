import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPgPool } from "../../../lib/pg";
import { isDatabaseUnavailableError, noteDatabaseFailure } from "../../../lib/dbGuard";

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
  if (value === null || value === undefined || cleanText(value) === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99) return null;
  return Math.round(parsed);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const competitionType = cleanText(body.competitionType).toUpperCase();
    if (!COMPETITIONS.has(competitionType)) {
      return NextResponse.json({ error: "Please choose a competition." }, { status: 400 });
    }

    let participantName: string | null = null;
    let age: number | null = null;
    let gender: string | null = null;
    let teamName: string | null = null;
    let playerOne: string | null = null;
    let playerTwo: string | null = null;
    let playerThree: string | null = null;
    let playerFour: string | null = null;

    if (competitionType === "3X3_MEN" || competitionType === "3X3_WOMEN") {
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
        return NextResponse.json({ error: "Name and age are required." }, { status: 400 });
      }

      if (competitionType === "KING") {
        gender = "MALE";
      } else if (competitionType === "QUEEN") {
        gender = "FEMALE";
      } else if (competitionType === "KING_QUEEN" || competitionType === "JACK_OF_THE_COURT") {
        gender = cleanText(body.gender).toUpperCase();
        if (gender !== "MALE" && gender !== "FEMALE") {
          return NextResponse.json({ error: "Please choose male or female." }, { status: 400 });
        }
      } else if (competitionType === "THREE_POINT_MEN") {
        gender = "MALE";
      }
    }

    const id = randomUUID();
    await getPgPool().query(
      `
      INSERT INTO "CompetitionRegistration" (
        "id",
        "competitionType",
        "participantName",
        "age",
        "gender",
        "teamName",
        "playerOne",
        "playerTwo",
        "playerThree",
        "playerFour",
        "source",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'WEBSITE', 'NEW', NOW(), NOW())
      `,
      [
        id,
        competitionType,
        participantName,
        age,
        gender,
        teamName,
        playerOne,
        playerTwo,
        playerThree,
        playerFour,
      ],
    );

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
