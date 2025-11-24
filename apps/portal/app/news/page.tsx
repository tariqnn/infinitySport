'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Table } from '@infinity/ui';
import { getNews } from '@infinity/mock-api';
import type { NewsItem } from '@infinity/types';
import { updatePinAction } from './actions';
import { NewsEditor } from './NewsEditor';
import { CreateNewsModal } from '../_components/CreateNewsModal';


type NewsRow = {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  pinned: string;
  actions: NewsItem;
};

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNews().then(data => {
      setNews(data);
      setLoading(false);
    });
  }, [isModalOpen]);

  const rows: NewsRow[] = news.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    createdAt: new Date(item.createdAt).toLocaleString(),
    pinned: item.pinned ? 'Yes' : 'No',
    actions: item
  }));

  return (
    <div className="space-y-12">
      <Card 
        title="Publish news" 
        description="Create an announcement for staff and coaches."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="btn-gradient">
            Publish News
          </Button>
        }
      />

      <Card title="News feed" description="Manage existing announcements">
        <Table
          rows={rows}
          columns={[
            { id: 'title', header: 'Title' },
            { id: 'author', header: 'Author' },
            { id: 'createdAt', header: 'Created' },
            {
              id: 'pinned',
              header: 'Pinned',
              render: (row: NewsRow) => (
                <form action={updatePinAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="checkbox" name="pinned" defaultChecked={row.pinned === 'Yes'} />
                  <Button size="sm" type="submit" variant="outline">
                    Save
                  </Button>
                </form>
              )
            },
            {
              id: 'actions',
              header: 'Actions',
              render: (row: NewsRow) => <NewsEditor news={row.actions} />
            }
          ]}
        />
      </Card>

      <CreateNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}


