export const USER_PATTERN = {
  LIST_CUSTOMERS: 'user.listCustomers',
  GET_CUSTOMER_BY_USER_ID: 'user.getCustomerByUserId',
  GET_CUSTOMER_BY_ID: 'user.getCustomerById',
  GET_CUSTOMERS_BY_IDS: 'user.getCustomersByIds',
  CREATE_CUSTOMER: 'user.createCustomer',
  UPDATE_CUSTOMER: 'user.updateCustomer',
  UPDATE_CUSTOMER_PROFILE: 'user.updateCustomerProfile',

  GET_CUSTOMER_ADDRESSES: 'user.getCustomerAddresses',
  ADD_CUSTOMER_ADDRESS: 'user.addCustomerAddress',
  UPDATE_CUSTOMER_ADDRESS: 'user.updateCustomerAddress',
  DELETE_CUSTOMER_ADDRESS: 'user.deleteCustomerAddress',

  GET_ALL_PROVINCES: 'user.getAllProvinces',
  GET_PROVINCES_BY_IDS: 'user.getProvincesByIds',

  GET_COMMUNES_BY_PROVINCE_CODE: 'user.getCommunesByProvinceCode',
  GET_COMMUNES_BY_IDS: 'user.getCommunesByIds',

  GET_NOTIFICATIONS: 'user.getNotifications',
  GET_UNREAD_NOTIFICATIONS: 'user.getUnreadNotifications',
  READ_NOTIFICATIONS: 'user.readNotifications',
};

export const USER_SERVICE_NAME = 'user-service';
