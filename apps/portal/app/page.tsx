import { Card, CardBody, KPIStatCard, Badge } from './_components/ui';
import { bookingsApi, classesApi, inventoryApi, tasksApi, financeApi, packageRegistrationsApi } from '../lib/portalApi';
import { getFirstCompany } from '../lib/portalApi';
import { QuickActions } from './_components/QuickActions';
import {
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const DASHBOARD_TIMEZONE = process.env.PORTAL_TIMEZONE || 'Asia/Amman';
const SUMMER_CAMP_PACKAGE_NAMES = new Set([
  'basketball summer camp',
  'volleyball summer camp',
]);

function isSummerCampRegistration(registration: { packageName?: string | null }) {
  return SUMMER_CAMP_PACKAGE_NAMES.has((registration.packageName ?? '').trim().toLowerCase());
}

function toDayKey(value: unknown): string | null {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DASHBOARD_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function getDashboardData() {
  try {
    const company = await getFirstCompany();
    const companyId = company?.id;

    const [bookingsResult, classesResult, inventoryResult, tasksResult, invoicesResult, registrationsResult] = await Promise.allSettled([
      bookingsApi.list(companyId),
      classesApi.list(companyId),
      inventoryApi.list(companyId),
      tasksApi.list(companyId),
      financeApi.invoices.list(companyId),
      packageRegistrationsApi.list(),
    ]);

    const bookings = bookingsResult.status === 'fulfilled' && Array.isArray(bookingsResult.value) ? bookingsResult.value : [];
    const classes = classesResult.status === 'fulfilled' && Array.isArray(classesResult.value) ? classesResult.value : [];
    const inventory = inventoryResult.status === 'fulfilled' && Array.isArray(inventoryResult.value) ? inventoryResult.value : [];
    const tasks = tasksResult.status === 'fulfilled' && Array.isArray(tasksResult.value) ? tasksResult.value : [];
    const invoices = invoicesResult.status === 'fulfilled' && Array.isArray(invoicesResult.value) ? invoicesResult.value : [];
    const registrations =
      registrationsResult.status === 'fulfilled' && Array.isArray(registrationsResult.value) ? registrationsResult.value : [];
    const summerCampRegistrations = registrations.filter((registration: any) => isSummerCampRegistration(registration));
    const regularRegistrations = registrations.filter((registration: any) => !isSummerCampRegistration(registration));

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

    const upcomingClasses = classes
      .filter((c: any) => {
        const classDate = new Date(c.startTime);
        return classDate >= today;
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);

    const lowInventory = inventory.filter((item: any) =>
      item.status === 'LOW' || item.status === 'OUT_OF_STOCK'
    ).slice(0, 5);

    const openTasks = tasks.filter((t: any) =>
      t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    ).slice(0, 5);

    const outstandingInvoices = Array.isArray(invoices) ? invoices.filter((i: any) =>
      i.status === 'DRAFT' || i.status === 'SENT' || i.status === 'OVERDUE'
    ) : [];
    const outstandingAmount = outstandingInvoices.reduce((sum: number, i: any) => sum + (i.amount ?? 0), 0);

    const todayKey = toDayKey(new Date());
    const bookingsTodayList = Array.isArray(bookings) ? bookings.filter((b: any) => {
      if (!todayKey) return false;
      return toDayKey(b.startTime) === todayKey;
    }) : [];
    const bookingsToday = bookingsTodayList.length;
    const bookingsTodayPending = bookingsTodayList.filter((b: any) => b.status === 'PENDING').length;

    return {
      companyId,
      upcomingBookings,
      upcomingClasses,
      lowInventory,
      openTasks,
      outstandingAmount,
      outstandingInvoicesCount: outstandingInvoices.length,
      activeMembersCount: regularRegistrations.length,
      summerCampMembersCount: summerCampRegistrations.length,
      bookingsToday,
      bookingsTodayPending,
    };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return {
      companyId: undefined,
      upcomingBookings: [],
      upcomingClasses: [],
      lowInventory: [],
      openTasks: [],
      outstandingAmount: 0,
      outstandingInvoicesCount: 0,
      activeMembersCount: 0,
      summerCampMembersCount: 0,
      bookingsToday: 0,
      bookingsTodayPending: 0,
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { companyId, upcomingBookings, upcomingClasses, lowInventory, openTasks, outstandingAmount, outstandingInvoicesCount, activeMembersCount, summerCampMembersCount, bookingsToday, bookingsTodayPending } = data;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ui-textPrimary sm:text-4xl">Dashboard</h1>
        <p className="text-base text-ui-textMuted">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <KPIStatCard
          label="Active Members"
          value={activeMembersCount.toLocaleString()}
          caption="Registrations page"
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconTone="blue"
        />
        <KPIStatCard
          label="Summer Camp Members"
          value={summerCampMembersCount.toLocaleString()}
          caption="Summer camp page"
          icon={<SunIcon className="h-6 w-6" />}
          iconTone="amber"
        />
        <KPIStatCard
          label="Bookings Today"
          value={bookingsToday.toString()}
          caption="From bookings"
          icon={<CalendarIcon className="h-6 w-6" />}
          iconTone="blue"
          badge={bookingsTodayPending > 0 ? `${bookingsTodayPending} pending` : undefined}
          badgeTone="neutral"
        />
        <KPIStatCard
          label="Invoices"
          value={`JD ${outstandingAmount.toLocaleString()}`}
          caption={`${outstandingInvoicesCount} outstanding`}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          iconTone="amber"
        />
        <KPIStatCard
          label="Open Tasks"
          value={openTasks.length.toString()}
          caption="In progress"
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          iconTone="red"
          badge="Priority"
          badgeTone="red"
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ui-textPrimary">Quick Actions</h2>
        <QuickActions companyId={companyId} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardBody>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ui-textPrimary">Upcoming Classes</h3>
              <Link href="/classes" className="text-base font-bold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {upcomingClasses.length > 0 ? (
              <div className="overflow-hidden rounded-xl border-2 border-ui-border">
                <table className="w-full">
                  <thead className="bg-ui-softBg">
                    <tr className="text-sm font-bold uppercase tracking-wide text-ui-textMuted">
                      <th className="px-5 py-4 text-left">Class Name</th>
                      <th className="px-5 py-4 text-left">Instructor</th>
                      <th className="px-5 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border bg-white">
                    {upcomingClasses.map((classItem: any) => {
                      const startTime = new Date(classItem.startTime);
                      return (
                        <tr key={classItem.id} className="hover:bg-[#f0f5ff]">
                          <td className="px-5 py-4 text-base font-semibold text-ui-textPrimary">{classItem.name}</td>
                          <td className="px-5 py-4 text-base text-ui-textMuted">
                            {classItem.coach ? `${classItem.coach.firstName} ${classItem.coach.lastName}` : '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-base font-bold text-brand-primaryBlue">
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-12 text-center text-base text-ui-textMuted">No upcoming classes</p>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardBody>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ui-textPrimary">Upcoming Bookings</h3>
              <Link href="/bookings" className="text-base font-bold text-brand-primaryBlue hover:underline">
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
                      className="flex items-center justify-between rounded-xl border-2 border-ui-border bg-white px-5 py-4 shadow-sm hover:bg-[#f0f5ff]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ui-softBg text-sm font-bold text-ui-textPrimary">
                          {initials || 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-ui-textPrimary">
                            {booking.customerName ||
                              (booking.member ? `${booking.member.firstName} ${booking.member.lastName}` : 'Booking')}
                          </p>
                          <p className="text-sm text-ui-textMuted">{booking.facilityArea || 'Facility'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base font-bold text-ui-textPrimary">
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'neutral'}>
                          {booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-12 text-center text-base text-ui-textMuted">No upcoming bookings</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Inventory */}
        <Card>
          <CardBody>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ui-textPrimary">Low Inventory</h3>
              <Link href="/inventory" className="text-base font-bold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {lowInventory.length > 0 ? (
              <div className="space-y-3">
                {lowInventory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border-2 border-ui-border bg-ui-cardBg p-4"
                  >
                    <div>
                      <p className="text-base font-semibold text-ui-textPrimary">{item.name}</p>
                      <p className="text-sm text-ui-textMuted">Quantity: {item.quantity}</p>
                    </div>
                    <Badge variant={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                      {item.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-base text-ui-textMuted">All inventory levels are good</p>
            )}
          </CardBody>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardBody>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ui-textPrimary">Open Tasks</h3>
              <Link href="/staff" className="text-base font-bold text-brand-primaryBlue hover:underline">
                View all
              </Link>
            </div>
            {openTasks.length > 0 ? (
              <div className="space-y-3">
                {openTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border-2 border-ui-border bg-ui-cardBg p-4"
                  >
                    <div>
                      <p className="text-base font-semibold text-ui-textPrimary">{task.title}</p>
                      {task.assignedTo && (
                        <p className="text-sm text-ui-textMuted">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
                      {task.status === 'IN_PROGRESS' ? 'In Progress' : 'Open'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-base text-ui-textMuted">No open tasks</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
