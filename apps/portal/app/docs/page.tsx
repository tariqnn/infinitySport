import { Card, Input, Table } from '@infinity/ui';
import { getDocs } from '@infinity/mock-api';

export const metadata = {
  title: 'Documents'
};

export default async function DocsPage() {
  const docs = await getDocs();
  const rows = docs.map((d) => ({
    id: d.id,
    name: d.name,
    folder: d.folder ?? 'General',
    tags: (d.tags ?? []).join(', '),
    access: d.access.join(', '),
    uploadedBy: d.uploadedBy,
    uploadedAt: new Date(d.uploadedAt).toLocaleString()
  }));

  return (
    <div className="space-y-6">
      <Card title="Search documents">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Search" placeholder="Name or tag" />
          <Input label="Folder" placeholder="Finance, Compliance…" />
          <Input label="Tag" placeholder="template, policy…" />
        </div>
      </Card>
      <Card title="Library">
        <Table
          rows={rows}
          columns={[
            { id: 'name', header: 'Name' },
            { id: 'folder', header: 'Folder' },
            { id: 'tags', header: 'Tags' },
            { id: 'access', header: 'Access' },
            { id: 'uploadedBy', header: 'Uploaded by' },
            { id: 'uploadedAt', header: 'Uploaded at' }
          ]}
          emptyMessage="No documents found."
        />
      </Card>
    </div>
  );
}



