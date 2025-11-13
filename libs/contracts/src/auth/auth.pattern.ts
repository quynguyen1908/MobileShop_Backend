export const AUTH_PATTERN = {
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  CHANGE_PASSWORD: 'auth.changePassword',
  REFRESH_TOKEN: 'auth.refreshToken',
  VALIDATE_TOKEN: 'auth.validateToken',
  DECODE_TOKEN: 'auth.decodeToken',
  GOOGLE_LOGIN: 'auth.googleLogin',
  GET_ADMIN_USER_IDS: 'auth.getAdminUserIds',
  GET_CUSTOMER_USER_IDS: 'auth.getCustomerUserIds',

  GET_USERS_BY_IDS: 'auth.getUsersByIds',
  GET_USER: 'auth.getUser',
  GET_USER_BY_EMAIL: 'auth.getUserByEmail',
  GET_PROFILE: 'auth.getProfile',
  CREATE_USER: 'auth.createUser',
  CREATE_ADMIN: 'auth.createAdmin',
  UPDATE_PROFILE: 'auth.updateProfile',
  UPDATE_USER: 'auth.updateUser',
  DELETE_USER: 'auth.deleteUser',
  LIST_USERS: 'auth.listUsers',

  TEST: 'auth.test',
};

export const AUTH_SERVICE_NAME = 'auth-service';
