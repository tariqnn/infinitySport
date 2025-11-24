import { PageHeader, Card, CardBody, KPIStatCard, DataTable, Badge } from './_components/ui';
import { dashboardApi, bookingsApi, classesApi, inventoryApi, tasksApi, financeApi } from '../lib/portalApi';
import { getFirstCompany } from '../lib/portalApi';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  CurrencyDollarIcon, 
  InboxStackIcon,
  ClipboardDocumentCheckIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

async function getDashboardData() {
  try {
    const company = await getFirstCompany();
    const companyId = company?.id;

    const [stats, bookings, classes, inventory, tasks, invoices] = await Promise.all([
      dashboardApi.stats(companyId),
      bookingsApi.list(companyId),
      classesApi.list(companyId),
      inventoryApi.list(companyId),
      tasksApi.list(companyId),
      financeApi.invoices.list(companyId),
    ]);

    // Calculate upcoming bookings (next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingBookings = bookings
      .filter((b: any) => {
        const bookingDate = new Date(b.startTime);
        return bookingDate >= today && bookingDate <= nextWeek;
      })
      .slice(0, 5);

    // Calculate upcoming classes (next few)
    const upcomingClasses = classes
      .filter((c: any) => {
        const classDate = new Date(c.startTime);
        return classDate >= today;
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);

    // Low inventory items
    const lowInventory = inventory.filter((item: any) => 
      item.status === 'LOW' || item.status === 'OUT_OF_STOCK'
    ).slice(0, 5);

    // Open tasks
    const openTasks = tasks.filter((t: any) => 
      t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    ).slice(0, 5);

    // Outstanding invoices
    const outstandingInvoices = invoices.filter((i: any) => 
      i.status === 'DRAFT' || i.status === 'SENT' || i.status === 'OVERDUE'
    );
    const outstandingAmount = outstandingInvoices.reduce((sum: number, i: any) => sum + i.amount, 0);

    return {
      stats,
      upcomingBookings,
      upcomingClasses,
      lowInventory,
      openTasks,
      outstandingAmount,
      bookingsToday: bookings.filter((b: any) => {
        const bookingDate = new Date(b.startTime);
        return bookingDate.toDateString() === today.toDateString();
      }).length,
    };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return {
      stats: { totalMembers: 0, activeCoaches: 0, activeClasses: 0, activeSubscriptions: 0, pendingBookings: 0, pendingInvoices: 0, openTasks: 0, lowInventory: 0 },
      upcomingBookings: [],
      upcomingClasses: [],
      lowInventory: [],
      openTasks: [],
      outstandingAmount: 0,
      bookingsToday: 0,
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { stats, upcomingBookings, upcomingClasses, lowInventory, openTasks, outstandingAmount, bookingsToday } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your facility operations and performance"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          label="Active Members"
          value={stats.totalMembers.toLocaleString()}
          caption="Total members"
          icon={<UserGroupIcon className="h-6 w-6" />}
        />
        <KPIStatCard
          label="Bookings Today"
          value={bookingsToday.toString()}
          caption="Scheduled"
          icon={<CalendarIcon className="h-6 w-6" />}
        />
        <KPIStatCard
          label="Outstanding Invoices"
          value={`JD ${outstandingAmount.toLocaleString()}`}
          caption={`${stats.pendingInvoices} invoices`}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
        />
        <KPIStatCard
          label="Open Tasks"
          value={stats.openTasks.toString()}
          caption="In progress"
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-textPrimary">Upcoming Classes</h3>
              <Link href="/classes" className="text-sm font-semibold text-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {upcomingClasses.length > 0 ? (
              <div className="space-y-3">
                {upcomingClasses.map((classItem: any) => {
                  const startTime = new Date(classItem.startTime);
                  return (
                    <div
                      key={classItem.id}
                      className="flex items-center justify-between rounded-lg border border-borderColor bg-cardBackground p-3 transition hover:border-primaryBlue hover:shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-textPrimary">{classItem.name}</p>
                        <p className="text-sm text-textMuted">
                          {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {classItem.coach && (
                        <span className="text-sm text-textMuted">{classItem.coach.firstName} {classItem.coach.lastName}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-textMuted">No upcoming classes</p>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-textPrimary">Upcoming Bookings</h3>
              <Link href="/bookings" className="text-sm font-semibold text-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((booking: any) => {
                  const startTime = new Date(booking.startTime);
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg border border-borderColor bg-cardBackground p-3 transition hover:border-primaryBlue hover:shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-textPrimary">
                          {booking.facilityArea || 'Facility'}
                        </p>
                        <p className="text-sm text-textMuted">
                          {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'neutral'}>
                        {booking.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-textMuted">No upcoming bookings</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Inventory */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-textPrimary">Low Inventory</h3>
              <Link href="/inventory" className="text-sm font-semibold text-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {lowInventory.length > 0 ? (
              <div className="space-y-2">
                {lowInventory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-borderColor bg-cardBackground p-3"
                  >
                    <div>
                      <p className="font-medium text-textPrimary">{item.name}</p>
                      <p className="text-sm text-textMuted">Quantity: {item.quantity}</p>
                    </div>
                    <Badge variant={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-textMuted">All inventory levels are good</p>
            )}
          </CardBody>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-textPrimary">Open Tasks</h3>
              <Link href="/staff" className="text-sm font-semibold text-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {openTasks.length > 0 ? (
              <div className="space-y-2">
                {openTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-borderColor bg-cardBackground p-3"
                  >
                    <div>
                      <p className="font-medium text-textPrimary">{task.title}</p>
                      {task.assignedTo && (
                        <p className="text-sm text-textMuted">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-textMuted">No open tasks</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
