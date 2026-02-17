import { Card, CardBody, KPIStatCard, Badge } from './_components/ui';
import { dashboardApi, bookingsApi, classesApi, inventoryApi, tasksApi, financeApi, packageRegistrationsApi } from '../lib/portalApi';
import { getFirstCompany } from '../lib/portalApi';
import { QuickActions } from './_components/QuickActions';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  CurrencyDollarIcon, 
  ClipboardDocumentCheckIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

async function getDashboardData() {
  try {
    const company = await getFirstCompany();
    const companyId = company?.id;

    const [stats, bookings, classes, inventory, tasks, invoices, registrations] = await Promise.all([
      dashboardApi.stats(companyId),
      bookingsApi.list(companyId),
      classesApi.list(companyId),
      inventoryApi.list(companyId),
      tasksApi.list(companyId),
      financeApi.invoices.list(companyId),
      packageRegistrationsApi.list(),
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

    // Outstanding invoices (same logic as Financials page)
    const outstandingInvoices = Array.isArray(invoices) ? invoices.filter((i: any) =>
      i.status === 'DRAFT' || i.status === 'SENT' || i.status === 'OVERDUE'
    ) : [];
    const outstandingAmount = outstandingInvoices.reduce((sum: number, i: any) => sum + (i.amount ?? 0), 0);

    // Bookings today (same data as Bookings page)
    const bookingsTodayList = Array.isArray(bookings) ? bookings.filter((b: any) => {
      const bookingDate = new Date(b.startTime);
      return bookingDate.toDateString() === today.toDateString();
    }) : [];
    const bookingsToday = bookingsTodayList.length;
    const bookingsTodayPending = bookingsTodayList.filter((b: any) => b.status === 'PENDING').length;

    return {
      companyId,
      stats,
      upcomingBookings,
      upcomingClasses,
      lowInventory,
      openTasks,
      outstandingAmount,
      outstandingInvoicesCount: outstandingInvoices.length,
      activeMembersCount: Array.isArray(registrations) ? registrations.length : 0,
      bookingsToday,
      bookingsTodayPending,
    };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return {
      companyId: undefined,
      stats: { totalMembers: 0, activeCoaches: 0, activeClasses: 0, activeSubscriptions: 0, pendingBookings: 0, pendingInvoices: 0, openTasks: 0, lowInventory: 0 },
      upcomingBookings: [],
      upcomingClasses: [],
      lowInventory: [],
      openTasks: [],
      outstandingAmount: 0,
      outstandingInvoicesCount: 0,
      activeMembersCount: 0,
      bookingsToday: 0,
      bookingsTodayPending: 0,
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { companyId, stats, upcomingBookings, upcomingClasses, lowInventory, openTasks, outstandingAmount, outstandingInvoicesCount, activeMembersCount, bookingsToday, bookingsTodayPending } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ui-textPrimary">DASHBOARD</h1>
        <p className="text-sm text-ui-textMuted">Welcome back, Admin. Here’s what’s happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          label="Active Members"
          value={activeMembersCount.toLocaleString()}
          caption="Package registrations"
          icon={<UserGroupIcon className="h-5 w-5" />}
          iconTone="blue"
          badge="+12%"
          badgeTone="green"
        />
        <KPIStatCard
          label="Bookings Today"
          value={bookingsToday.toString()}
          caption="From bookings"
          icon={<CalendarIcon className="h-5 w-5" />}
          iconTone="blue"
          badge={bookingsTodayPending > 0 ? `${bookingsTodayPending} pending` : undefined}
          badgeTone="neutral"
        />
        <KPIStatCard
          label="Invoices"
          value={`JD ${outstandingAmount.toLocaleString()}`}
          caption={`${outstandingInvoicesCount} outstanding`}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconTone="amber"
        />
        <KPIStatCard
          label="Open Tasks"
          value={stats.openTasks.toString()}
          caption="In progress"
          icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
          iconTone="red"
          badge="Priority"
          badgeTone="red"
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-ui-textPrimary">Quick Actions</h2>
        <QuickActions companyId={companyId} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ui-textPrimary">UPCOMING CLASSES</h3>
              <Link href="/classes" className="text-sm font-semibold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {upcomingClasses.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-ui-border">
                <table className="w-full text-sm">
                  <thead className="bg-ui-softBg">
                    <tr className="text-xs font-bold uppercase tracking-[0.18em] text-ui-textMuted">
                      <th className="px-4 py-3 text-left">Class name</th>
                      <th className="px-4 py-3 text-left">Instructor</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border bg-white">
                    {upcomingClasses.map((classItem: any) => {
                      const startTime = new Date(classItem.startTime);
                      return (
                        <tr key={classItem.id} className="hover:bg-ui-softBg/40">
                          <td className="px-4 py-3 font-semibold text-ui-textPrimary">{classItem.name}</td>
                          <td className="px-4 py-3 text-ui-textMuted">
                            {classItem.coach ? `${classItem.coach.firstName} ${classItem.coach.lastName}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-primaryBlue">
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-10 text-center text-ui-textMuted">No upcoming classes</p>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ui-textPrimary">UPCOMING BOOKINGS</h3>
              <Link href="/bookings" className="text-sm font-semibold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((booking: any) => {
                  const startTime = new Date(booking.startTime);
                  const initials = (booking.customerName || booking.member?.firstName || 'M')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s: string) => s[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-2xl border border-ui-border bg-white px-4 py-3 shadow-sm hover:bg-ui-softBg/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-softBg text-xs font-bold text-ui-textPrimary">
                          {initials || 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ui-textPrimary">
                            {booking.customerName ||
                              (booking.member ? `${booking.member.firstName} ${booking.member.lastName}` : 'Booking')}
                          </p>
                          <p className="text-xs text-ui-textMuted">{booking.facilityArea || 'Facility'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-ui-textPrimary">
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ui-textMuted">
                            {booking.status}
                          </p>
                        </div>
                        <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'neutral'}>
                          {booking.status === 'CONFIRMED' ? 'CONFIRMED' : booking.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-ui-textMuted">No upcoming bookings</p>
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
              <h3 className="text-lg font-semibold text-ui-textPrimary">Low Inventory</h3>
              <Link href="/inventory" className="text-sm font-semibold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {lowInventory.length > 0 ? (
              <div className="space-y-2">
                {lowInventory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-ui-border bg-ui-cardBg p-3"
                  >
                    <div>
                      <p className="font-medium text-ui-textPrimary">{item.name}</p>
                      <p className="text-sm text-ui-textMuted">Quantity: {item.quantity}</p>
                    </div>
                    <Badge variant={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-ui-textMuted">All inventory levels are good</p>
            )}
          </CardBody>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ui-textPrimary">Open Tasks</h3>
              <Link href="/staff" className="text-sm font-semibold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {openTasks.length > 0 ? (
              <div className="space-y-2">
                {openTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-ui-border bg-ui-cardBg p-3"
                  >
                    <div>
                      <p className="font-medium text-ui-textPrimary">{task.title}</p>
                      {task.assignedTo && (
                        <p className="text-sm text-ui-textMuted">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-ui-textMuted">No open tasks</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
