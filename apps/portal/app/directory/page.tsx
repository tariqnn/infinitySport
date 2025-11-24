import { Card, Input, Table } from '@infinity/ui';
import { getDirectory } from '@infinity/mock-api';

export const metadata = {
  title: 'Directory'
};

export default async function DirectoryPage() {
  const directory = await getDirectory();
  const rows = directory.map((d) => ({
    id: d.id,
    fullName: d.fullName,
    roleTitle: d.roleTitle,
    department: d.department ?? '—',
    email: d.email,
    phone: d.phone ?? '—'
  }));

  return (
    <div className="space-y-6">
      <Card title="Search">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Name" placeholder="Full name" />
          <Input label="Department" placeholder="Finance, Coaching…" />
          <Input label="Role" placeholder="Title" />
        </div>
      </Card>
      <Card title="Employee directory">
        <Table
          rows={rows}
          columns={[
            { id: 'fullName', header: 'Name' },
            { id: 'roleTitle', header: 'Role' },
            { id: 'department', header: 'Department' },
            { id: 'email', header: 'Email' },
            { id: 'phone', header: 'Phone' }
          ]}
          emptyMessage="No matches."
        />
      </Card>
    </div>
  );
}



