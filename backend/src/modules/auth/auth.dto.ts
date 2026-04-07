export type AuthProfileDto = {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
};

export type LoginResponseDto = {
  accessToken: string;
  user: AuthProfileDto;
};