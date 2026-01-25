import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { nanoid } from 'nanoid';
import { db } from './db';
import type {
  IntroContent,
  Sport,
  Facility,
  EventItem,
  NewsItem,
  DocItem,
  PettyCashTxn,
} from '@infinity/types';

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
