export const MINI_MAIN_ROUTES = {
  home: '/pages/home/index',
  park: '/pages/park/index',
  member: '/pages/member/index',
  profile: '/pages/profile/index',
} as const;

export const MINI_PACKAGE_ROUTES = {
  mallHome: '/pkg-mall/pages/index/index',
  memberHome: '/pkg-member/pages/index/index',
  memberCode: '/pkg-member/pages/member-code/index',
  hotelHome: '/pkg-hotel/pages/index/index',
  ticketHome: '/pkg-ticket/pages/index/index',
  ticketBooking: '/pkg-ticket/pages/ticket-booking/index',
  diningHome: '/pkg-dining/pages/index/index',
  orderHome: '/pkg-order/pages/index/index',
} as const;

export type MiniMainRoute = (typeof MINI_MAIN_ROUTES)[keyof typeof MINI_MAIN_ROUTES];
export type MiniPackageRoute = (typeof MINI_PACKAGE_ROUTES)[keyof typeof MINI_PACKAGE_ROUTES];
export type MiniRoute = MiniMainRoute | MiniPackageRoute;
