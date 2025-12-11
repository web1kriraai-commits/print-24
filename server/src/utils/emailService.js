import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  // For Gmail, you can use app-specific password
  // For other services, adjust accordingly
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App-specific password for Gmail
    },
  });
};

// Send account creation email
export const sendAccountCreationEmail = async (userEmail, userName, tempPassword) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email send.");
      return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Print24'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Welcome to Print24 - Your Account Has Been Created",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .password-box { background-color: #fff; padding: 15px; border: 2px dashed #8B7355; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; color: #8B7355; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Print24!</h1>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              <p>Your account has been successfully created! We're excited to have you on board.</p>
              <p>Your account details:</p>
              <ul>
                <li><strong>Email:</strong> ${userEmail}</li>
                <li><strong>Temporary Password:</strong></li>
              </ul>
              <div class="password-box">${tempPassword}</div>
              <p><strong>Important:</strong> Please change your password after logging in for security purposes.</p>
              <p>You can now log in to your account and track your orders.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/login" class="button">Login to Your Account</a>
              <div class="footer">
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>The Print24 Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Print24!
        
        Dear ${userName},
        
        Your account has been successfully created! We're excited to have you on board.
        
        Your account details:
        Email: ${userEmail}
        Temporary Password: ${tempPassword}
        
        Important: Please change your password after logging in for security purposes.
        
        You can now log in to your account and track your orders.
        Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/login
        
        If you have any questions, please don't hesitate to contact us.
        
        Best regards,
        The Print24 Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Account creation email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending account creation email:", error);
    // Don't throw error - email failure shouldn't block account creation
    return null;
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (userEmail, userName, orderNumber, orderDetails) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email send.");
      return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Print24'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Order Confirmation - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .order-info h3 { color: #8B7355; margin-top: 0; }
            .order-info p { margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              <p>Thank you for your order! We've received your order and will begin processing it shortly.</p>
              <div class="order-info">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Product:</strong> ${orderDetails.productName || 'N/A'}</p>
                <p><strong>Quantity:</strong> ${orderDetails.quantity || 'N/A'}</p>
                <p><strong>Total Price:</strong> ₹${orderDetails.totalPrice || '0.00'}</p>
                <p><strong>Status:</strong> ${orderDetails.status || 'Request'}</p>
              </div>
              <p>You can track your order status by logging into your account.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile" class="button">View My Orders</a>
              <div class="footer">
                <p>If you have any questions about your order, please contact us.</p>
                <p>Best regards,<br>The Print24 Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Confirmation
        
        Dear ${userName},
        
        Thank you for your order! We've received your order and will begin processing it shortly.
        
        Order Details:
        Order Number: ${orderNumber}
        Product: ${orderDetails.productName || 'N/A'}
        Quantity: ${orderDetails.quantity || 'N/A'}
        Total Price: ₹${orderDetails.totalPrice || '0.00'}
        Status: ${orderDetails.status || 'Request'}
        
        You can track your order status by logging into your account.
        View Orders: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile
        
        If you have any questions about your order, please contact us.
        
        Best regards,
        The Print24 Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    // Don't throw error - email failure shouldn't block order creation
    return null;
  }
};


