import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { nanoid } from 'nanoid';
import introSeed from '../data/intro.json';
import sportsSeed from '../data/sports.json';
import facilitiesSeed from '../data/facilities.json';
import eventsSeed from '../data/events.json';
import newsSeed from '../data/news.json';
import docsSeed from '../data/docs.json';
import directorySeed from '../data/directory.json';
import budgetSeed from '../data/budget.json';
import invoicesSeed from '../data/invoices.json';
import cashflowSeed from '../data/cashflow.json';
import pettyCashSeed from '../data/pettycash.json';
import landingSeed from '../data/landing-content.json';
import {
  IntroContent,
  Sport,
  Facility,
  EventItem,
  NewsItem,
  DocItem,
  DirectoryEntry,
  BudgetLine,
  Invoice,
  CashFlowEntry,
  PettyCashTxn,
  LandingContent,
  LandingHero,
  LandingHighlight,
  LandingProgram,
  LandingOffer,
  LandingEvent,
  LandingAnnouncement,
  LandingFacilityHighlight,
  LandingFooter,
  ContactSubmission,
  landingContentSchema,
  landingHeroSchema,
  landingHighlightSchema,
  landingProgramSchema,
  landingOfferSchema,
  landingEventSchema,
  landingAnnouncementSchema,
  landingFacilityHighlightSchema,
  landingFooterSchema,
  contactSubmissionSchema,
  introContentSchema,
  sportSchema,
  facilitySchema,
  eventItemSchema,
  newsItemSchema,
  docItemSchema,
  pettyCashTxnSchema
} from '@infinity/types';

interface MockDatabase {
  intro: IntroContent;
  sports: Sport[];
  facilities: Facility[];
  events: EventItem[];
  news: NewsItem[];
  docs: DocItem[];
  directory: DirectoryEntry[];
  budget: BudgetLine[];
  invoices: Invoice[];
  cashflow: CashFlowEntry[];
  pettycash: PettyCashTxn[];
  landing: LandingContent;
}

const db: MockDatabase = {
  intro: structuredClone(introSeed),
  sports: structuredClone(sportsSeed),
  facilities: structuredClone(facilitiesSeed),
  events: structuredClone(eventsSeed),
  news: structuredClone(newsSeed),
  docs: structuredClone(docsSeed).map((doc) => docItemSchema.parse(doc)),
  directory: structuredClone(directorySeed),
  budget: structuredClone(budgetSeed),
  invoices: structuredClone(invoicesSeed).map((invoice) => ({
    ...invoice,
    status: invoice.status as Invoice['status'],
    currency: invoice.currency as Invoice['currency'],
  })),
  cashflow: structuredClone(cashflowSeed).map((entry) => ({
    ...entry,
    category: entry.category as CashFlowEntry['category'],
    currency: entry.currency as CashFlowEntry['currency'],
  })),
  pettycash: structuredClone(pettyCashSeed),
  landing: landingContentSchema.parse(structuredClone(landingSeed))
};

function jsonResponse<T>(data: T, init?: ResponseInit) {
  return HttpResponse.json(
    {
      data,
      meta: { generatedAt: new Date().toISOString() }
    },
    init
  );
}

function parseRequest<T>(request: Request) {
  return request.json() as Promise<T>;
}

function touchLanding(updatedBy?: string) {
  db.landing.updatedAt = new Date().toISOString();
  if (updatedBy) {
    db.landing.updatedBy = updatedBy;
  }
}

export function createHandlers() {
  return [
    http.get('/api/intro', async () => {
      await delay(200);
      return jsonResponse(db.intro);
    }),

    http.put('/api/intro', async ({ request }) => {
      const body = await parseRequest<Partial<IntroContent>>(request);
      db.intro = { ...db.intro, ...body, updatedAt: new Date().toISOString() };
      return jsonResponse(db.intro);
    }),

    http.get('/api/sports', async () => {
      await delay(150);
      return jsonResponse(db.sports.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }),
    http.post('/api/sports', async ({ request }) => {
      const sport = await parseRequest<Sport>(request);
      const newSport = { ...sport, id: sport.id || nanoid() };
      db.sports.push(newSport);
      return jsonResponse(newSport, { status: 201 });
    }),
    http.put('/api/sports/:id', async ({ params, request }) => {
      const id = params.id as string;
      const updates = await parseRequest<Partial<Sport>>(request);
      db.sports = db.sports.map((sport) => (sport.id === id ? { ...sport, ...updates } : sport));
      const sport = db.sports.find((item) => item.id === id);
      return jsonResponse(sport);
    }),
    http.delete('/api/sports/:id', async ({ params }) => {
      const id = params.id as string;
      db.sports = db.sports.filter((sport) => sport.id !== id);
      return HttpResponse.json(null, { status: 204 });
    }),

    http.get('/api/facilities', () => jsonResponse(db.facilities)),
    http.post('/api/facilities', async ({ request }) => {
      const facility = await parseRequest<Facility>(request);
      const newFacility = { ...facility, id: facility.id || nanoid() };
      db.facilities.push(newFacility);
      return jsonResponse(newFacility, { status: 201 });
    }),
    http.put('/api/facilities/:id', async ({ params, request }) => {
      const id = params.id as string;
      const updates = await parseRequest<Partial<Facility>>(request);
      db.facilities = db.facilities.map((facility) => (facility.id === id ? { ...facility, ...updates } : facility));
      const facility = db.facilities.find((item) => item.id === id);
      return jsonResponse(facility);
    }),
    http.delete('/api/facilities/:id', async ({ params }) => {
      const id = params.id as string;
      db.facilities = db.facilities.filter((facility) => facility.id !== id);
      return HttpResponse.json(null, { status: 204 });
    }),

    http.get('/api/events', () => jsonResponse(db.events)),
    http.post('/api/events', async ({ request }) => {
      const event = await parseRequest<EventItem>(request);
      const newEvent = { ...event, id: event.id || nanoid() };
      db.events.push(newEvent);
      return jsonResponse(newEvent, { status: 201 });
    }),
    http.put('/api/events/:id', async ({ params, request }) => {
      const id = params.id as string;
      const updates = await parseRequest<Partial<EventItem>>(request);
      db.events = db.events.map((event) => (event.id === id ? { ...event, ...updates } : event));
      const event = db.events.find((item) => item.id === id);
      return jsonResponse(event);
    }),
    http.delete('/api/events/:id', async ({ params }) => {
      const id = params.id as string;
      db.events = db.events.filter((event) => event.id !== id);
      return HttpResponse.json(null, { status: 204 });
    }),

    http.get('/api/news', () => jsonResponse(db.news)),
    http.post('/api/news', async ({ request }) => {
      const news = await parseRequest<NewsItem>(request);
      const newNews = { ...news, id: news.id || nanoid(), createdAt: news.createdAt ?? new Date().toISOString() };
      db.news = [newNews, ...db.news];
      return jsonResponse(newNews, { status: 201 });
    }),
    http.put('/api/news/:id', async ({ params, request }) => {
      const id = params.id as string;
      const updates = await parseRequest<Partial<NewsItem>>(request);
      db.news = db.news.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
      const news = db.news.find((item) => item.id === id);
      return jsonResponse(news);
    }),
    http.delete('/api/news/:id', async ({ params }) => {
      const id = params.id as string;
      db.news = db.news.filter((news) => news.id !== id);
      return HttpResponse.json(null, { status: 204 });
    }),

    http.get('/api/docs', () => jsonResponse(db.docs)),
    http.post('/api/docs', async ({ request }) => {
      const doc = await parseRequest<DocItem>(request);
      const newDoc = {
        ...doc,
        id: doc.id || nanoid(),
        uploadedAt: doc.uploadedAt ?? new Date().toISOString()
      };
      db.docs = [newDoc, ...db.docs];
      return jsonResponse(newDoc, { status: 201 });
    }),
    http.delete('/api/docs/:id', async ({ params }) => {
      const id = params.id as string;
      db.docs = db.docs.filter((doc) => doc.id !== id);
      return HttpResponse.json(null, { status: 204 });
    }),

    http.get('/api/directory', () => jsonResponse(db.directory)),
    http.get('/api/budget', () => jsonResponse(db.budget)),
    http.get('/api/invoices', () => jsonResponse(db.invoices)),
    http.get('/api/cashflow', () => jsonResponse(db.cashflow)),
    http.get('/api/pettycash', () => jsonResponse(db.pettycash)),
    http.put('/api/pettycash/:id', async ({ params, request }) => {
      const id = params.id as string;
      const updates = await parseRequest<Partial<PettyCashTxn>>(request);
      db.pettycash = db.pettycash.map((txn) => (txn.id === id ? { ...txn, ...updates } : txn));
      const txn = db.pettycash.find((item) => item.id === id);
      return jsonResponse(txn);
    })
  ];
}

export function setupMockServer() {
  const server = setupServer(...createHandlers());
  return server;
}

export type MockHandlers = ReturnType<typeof createHandlers>;

export function getMockDb(): MockDatabase {
  return structuredClone(db);
}

export function getIntroContent(): IntroContent {
  return structuredClone(db.intro);
}

export function getSports(): Sport[] {
  return structuredClone(db.sports);
}

export function getFacilities(): Facility[] {
  return structuredClone(db.facilities);
}

export function getEvents(): EventItem[] {
  return structuredClone(db.events);
}

export function getNews(): NewsItem[] {
  return structuredClone(db.news);
}

export function getDocs(): DocItem[] {
  return structuredClone(db.docs);
}

export function getDirectory(): DirectoryEntry[] {
  return structuredClone(db.directory);
}

export function getBudget(): BudgetLine[] {
  return structuredClone(db.budget);
}

export function getInvoices(): Invoice[] {
  return structuredClone(db.invoices);
}

export function getCashflow(): CashFlowEntry[] {
  return structuredClone(db.cashflow);
}

export function getPettyCash(): PettyCashTxn[] {
  return structuredClone(db.pettycash);
}

export function getLandingContent(): LandingContent {
  return structuredClone(db.landing);
}

export function updateIntroContent(payload: Partial<IntroContent>) {
  const parsed = introContentSchema.partial().parse(payload);
  db.intro = { ...db.intro, ...parsed, updatedAt: new Date().toISOString() };
  return structuredClone(db.intro);
}

export function createSport(input: Omit<Sport, 'id'> & { id?: string }) {
  const candidate = { ...input, id: input.id ?? nanoid() };
  const sport = sportSchema.parse(candidate);
  db.sports.push(sport);
  return structuredClone(sport);
}

export function updateSport(id: string, input: Partial<Sport>) {
  const partial = sportSchema.partial().parse({ ...input, id });
  db.sports = db.sports.map((sport) => (sport.id === id ? { ...sport, ...partial } : sport));
  const sport = db.sports.find((item) => item.id === id);
  return sport ? structuredClone(sport) : null;
}

export function deleteSport(id: string) {
  db.sports = db.sports.filter((sport) => sport.id !== id);
}

export function createFacility(input: Omit<Facility, 'id'> & { id?: string }) {
  const facility = facilitySchema.parse({ ...input, id: input.id ?? nanoid() });
  db.facilities.push(facility);
  return structuredClone(facility);
}

export function updateFacility(id: string, input: Partial<Facility>) {
  const partial = facilitySchema.partial().parse({ ...input, id });
  db.facilities = db.facilities.map((facility) => (facility.id === id ? { ...facility, ...partial } : facility));
  const facility = db.facilities.find((item) => item.id === id);
  return facility ? structuredClone(facility) : null;
}

export function deleteFacility(id: string) {
  db.facilities = db.facilities.filter((facility) => facility.id !== id);
}

export function createEvent(input: Omit<EventItem, 'id'> & { id?: string }) {
  const event = eventItemSchema.parse({ ...input, id: input.id ?? nanoid() });
  db.events.push(event);
  return structuredClone(event);
}

export function updateEvent(id: string, input: Partial<EventItem>) {
  const partial = eventItemSchema.partial().parse({ ...input, id });
  db.events = db.events.map((event) => (event.id === id ? { ...event, ...partial } : event));
  const event = db.events.find((item) => item.id === id);
  return event ? structuredClone(event) : null;
}

export function deleteEvent(id: string) {
  db.events = db.events.filter((event) => event.id !== id);
}

export function createNews(input: Omit<NewsItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const candidate = newsItemSchema.parse({
    ...input,
    id: input.id ?? nanoid(),
    createdAt: input.createdAt ?? new Date().toISOString()
  });
  db.news = [candidate, ...db.news];
  return structuredClone(candidate);
}

export function updateNews(id: string, input: Partial<NewsItem>) {
  const partial = newsItemSchema.partial().parse({ ...input, id });
  db.news = db.news.map((news) => (news.id === id ? { ...news, ...partial, updatedAt: new Date().toISOString() } : news));
  const news = db.news.find((item) => item.id === id);
  return news ? structuredClone(news) : null;
}

export function deleteNews(id: string) {
  db.news = db.news.filter((news) => news.id !== id);
}

export function createDoc(input: Omit<DocItem, 'id' | 'uploadedAt'> & { id?: string; uploadedAt?: string }) {
  const doc = docItemSchema.parse({
    ...input,
    id: input.id ?? nanoid(),
    uploadedAt: input.uploadedAt ?? new Date().toISOString()
  });
  db.docs = [doc, ...db.docs];
  return structuredClone(doc);
}

export function deleteDoc(id: string) {
  db.docs = db.docs.filter((doc) => doc.id !== id);
}

export function updatePettyCash(id: string, input: Partial<PettyCashTxn>) {
  const partial = pettyCashTxnSchema.partial().parse({ ...input, id });
  db.pettycash = db.pettycash.map((txn) => (txn.id === id ? { ...txn, ...partial } : txn));
  const txn = db.pettycash.find((item) => item.id === id);
  return txn ? structuredClone(txn) : null;
}

export function updateLandingHero(payload: Partial<LandingHero>, updatedBy = 'CMS Admin') {
  const parsed = landingHeroSchema.partial().parse(payload);
  db.landing.hero = { ...db.landing.hero, ...parsed };
  touchLanding(updatedBy);
  return structuredClone(db.landing.hero);
}

export function replaceLandingHighlights(highlights: LandingHighlight[], updatedBy = 'CMS Admin') {
  const parsed = highlights.map((highlight) =>
    landingHighlightSchema.parse({ ...highlight, id: highlight.id || nanoid() })
  );
  db.landing.highlights = parsed;
  touchLanding(updatedBy);
  return structuredClone(db.landing.highlights);
}

type ProgramInput = Omit<LandingProgram, 'id'> & { id?: string };

export function upsertLandingProgram(input: ProgramInput, updatedBy = 'CMS Admin') {
  const program = landingProgramSchema.parse({ ...input, id: input.id ?? nanoid() });
  const exists = db.landing.programs.some((item) => item.id === program.id);
  db.landing.programs = exists
    ? db.landing.programs.map((item) => (item.id === program.id ? program : item))
    : [program, ...db.landing.programs];
  touchLanding(updatedBy);
  return structuredClone(program);
}

export function deleteLandingProgram(id: string, updatedBy = 'CMS Admin') {
  db.landing.programs = db.landing.programs.filter((program) => program.id !== id);
  touchLanding(updatedBy);
}

type OfferInput = Omit<LandingOffer, 'id'> & { id?: string };

export function upsertLandingOffer(input: OfferInput, updatedBy = 'CMS Admin') {
  const offer = landingOfferSchema.parse({ ...input, id: input.id ?? nanoid() });
  const exists = db.landing.offers.some((item) => item.id === offer.id);
  db.landing.offers = exists
    ? db.landing.offers.map((item) => (item.id === offer.id ? offer : item))
    : [offer, ...db.landing.offers];
  touchLanding(updatedBy);
  return structuredClone(offer);
}

export function deleteLandingOffer(id: string, updatedBy = 'CMS Admin') {
  db.landing.offers = db.landing.offers.filter((offer) => offer.id !== id);
  touchLanding(updatedBy);
}

type LandingEventInput = Omit<LandingEvent, 'id'> & { id?: string };

export function upsertLandingEvent(input: LandingEventInput, updatedBy = 'CMS Admin') {
  const event = landingEventSchema.parse({ ...input, id: input.id ?? nanoid() });
  const exists = db.landing.events.some((item) => item.id === event.id);
  db.landing.events = exists
    ? db.landing.events.map((item) => (item.id === event.id ? event : item))
    : [event, ...db.landing.events];
  touchLanding(updatedBy);
  return structuredClone(event);
}

export function deleteLandingEvent(id: string, updatedBy = 'CMS Admin') {
  db.landing.events = db.landing.events.filter((event) => event.id !== id);
  touchLanding(updatedBy);
}

type AnnouncementInput = Omit<LandingAnnouncement, 'id'> & { id?: string };

export function upsertLandingAnnouncement(input: AnnouncementInput, updatedBy = 'CMS Admin') {
  const announcement = landingAnnouncementSchema.parse({ ...input, id: input.id ?? nanoid() });
  const exists = db.landing.announcements.some((item) => item.id === announcement.id);
  db.landing.announcements = exists
    ? db.landing.announcements.map((item) => (item.id === announcement.id ? announcement : item))
    : [announcement, ...db.landing.announcements];
  touchLanding(updatedBy);
  return structuredClone(announcement);
}

export function deleteLandingAnnouncement(id: string, updatedBy = 'CMS Admin') {
  db.landing.announcements = db.landing.announcements.filter((announcement) => announcement.id !== id);
  touchLanding(updatedBy);
}

type FacilityInput = Omit<LandingFacilityHighlight, 'id'> & { id?: string };

export function upsertLandingFacility(input: FacilityInput, updatedBy = 'CMS Admin') {
  const facility = landingFacilityHighlightSchema.parse({ ...input, id: input.id ?? nanoid() });
  const exists = db.landing.facilityHighlights.some((item) => item.id === facility.id);
  db.landing.facilityHighlights = exists
    ? db.landing.facilityHighlights.map((item) => (item.id === facility.id ? facility : item))
    : [facility, ...db.landing.facilityHighlights];
  touchLanding(updatedBy);
  return structuredClone(facility);
}

export function deleteLandingFacility(id: string, updatedBy = 'CMS Admin') {
  db.landing.facilityHighlights = db.landing.facilityHighlights.filter((facility) => facility.id !== id);
  touchLanding(updatedBy);
}

export function updateLandingFooter(payload: Partial<LandingFooter>, updatedBy = 'CMS Admin') {
  const parsed = landingFooterSchema.partial().parse(payload);
  db.landing.footer = { ...db.landing.footer, ...parsed };
  touchLanding(updatedBy);
  return structuredClone(db.landing.footer);
}

export function submitContactRequest(input: { name: string; email: string; message: string }): ContactSubmission {
  const recipient = db.landing.footer.contactRecipientEmail ?? db.landing.footer.email;
  const submission = contactSubmissionSchema.parse({
    name: input.name,
    email: input.email,
    message: input.message,
    recipient,
    submittedAt: new Date().toISOString(),
  });
  return submission;
}

