const amqp = require('amqplib');

async function checkRabbitMQConnection() {
  try {
    // Lấy thông tin kết nối từ biến môi trường hoặc sử dụng giá trị mặc định
    const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672/';
    const queueName = process.env.PAYMENT_SERVICE_QUEUE || 'payment_queue';
    
    // Kết nối đến RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    
    // Kiểm tra queue tồn tại
    await channel.checkQueue(queueName);
    
    // Đóng kết nối
    await channel.close();
    await connection.close();

    console.log('Payment Service Healthcheck passed: RabbitMQ connection successful');
    process.exit(0);
  } catch (error) {
    console.error('Payment Service Healthcheck failed:', error.message);
    process.exit(1);
  }
}

// Thực hiện kiểm tra
checkRabbitMQConnection();