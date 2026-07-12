import 'package:flutter_test/flutter_test.dart';
import 'package:infinity_portal_mobile/notifications.dart';

void main() {
  test('routes core notification payloads to the correct tabs', () {
    expect(
      PortalNotificationSelection.fromData({
        'type': 'BOOKING_CREATED',
        'bookingId': 'booking-1',
      })?.tabIndex,
      0,
    );
    expect(
      PortalNotificationSelection.fromData({
        'type': 'REGISTRATION_CREATED',
        'registrationId': 'registration-1',
      })?.tabIndex,
      2,
    );
    expect(
      PortalNotificationSelection.fromData({
        'type': 'COMPETITION_REGISTRATION_CREATED',
        'competitionRegistrationId': 'competition-1',
      })?.tabIndex,
      3,
    );
  });

  test('routes expanded portal notification payloads to Summer and More', () {
    final summer = PortalNotificationSelection.fromData({
      'type': 'SUMMER_CAMP_REGISTRATION_CREATED',
      'summerCampRegistrationId': 'summer-1',
    });
    final guest = PortalNotificationSelection.fromData({
      'type': 'GUEST_ACCOUNT_UPDATED',
      'guestEmail': 'guest@example.com',
    });
    final coach = PortalNotificationSelection.fromData({
      'type': 'COACH_UPDATED',
      'coachId': 'coach-1',
    });

    expect(summer?.tabIndex, 1);
    expect(summer?.moreSection, isNull);
    expect(guest?.tabIndex, 4);
    expect(guest?.moreSection, 'guests');
    expect(coach?.tabIndex, 4);
    expect(coach?.moreSection, 'coaches');
  });
}
