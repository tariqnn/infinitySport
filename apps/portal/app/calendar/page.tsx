'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button } from '@infinity/ui';
import { getEvents } from '@infinity/mock-api';
import type { EventItem } from '@infinity/types';
import { EventEditor } from './EventEditor';
import { CreateEventModal } from '../_components/CreateEventModal';

type CalendarRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  event: EventItem;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents().then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, [isModalOpen]);

  const rows: CalendarRow[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: new Date(event.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }),
    location: event.location ?? 'Infinity Campus',
    event
  }));

  return (
    <div className="space-y-12">
      <Card 
        title="Create event" 
        description="Add a new event to the team calendar."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="btn-gradient">
            Create Event
          </Button>
        }
      />

      <Card title="Team calendar" description="Manage upcoming events and activities.">
        <Table
          rows={rows}
          columns={[
            { id: 'title', header: 'Event' },
            { id: 'date', header: 'Date' },
            { id: 'location', header: 'Location' },
            {
              id: 'actions',
              header: 'Actions',
              render: (row: CalendarRow) => <EventEditor event={row.event} />
            }
          ]}
        />
      </Card>

      <CreateEventModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
