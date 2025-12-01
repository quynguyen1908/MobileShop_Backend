export const ORDER_PATTERN = {
  GET_ORDERS_BY_CUSTOMER_ID: 'order.getOrdersByCustomerId',
  GET_ORDER_BY_ORDER_CODE: 'order.getOrderByOrderCode',
  GET_ORDER_BY_ID: 'order.getOrderById',
  GET_CUSTOMER_ORDER_DETAIL: 'order.getCustomerOrderDetail',
  GET_ORDER_DETAIL: 'order.getOrderDetail',
  HAS_CUSTOMER_ORDERED_VARIANT: 'order.hasCustomerOrderedVariant',
  LIST_CUSTOMER_ORDERS: 'order.listCustomerOrders',
  LIST_ORDERS: 'order.listOrders',
  CREATE_ORDER: 'order.createOrder',
  CANCEL_ORDER: 'order.cancelOrder',

  GET_POINT_CONFIG: 'order.getPointConfig',

  CALCULATE_SHIPPING_FEE: 'order.calculateShippingFee',

  UPDATE_ORDER_STATUS: 'order.updateOrderStatus',

  GET_POINT_TRANSACTIONS_BY_CUSTOMER_ID:
    'order.getPointTransactionsByCustomerId',

  GET_CART_BY_CUSTOMER_ID: 'order.getCartByCustomerId',
  ADD_TO_CART: 'order.addToCart',
  UPDATE_QUANTITY: 'order.updateQuantity',
  DELETE_CART_ITEMS: 'order.deleteCartItems',

  GET_DASHBOARD_STATS: 'order.getDashboardStats',
};

export const ORDER_SERVICE_NAME = 'order-service';
