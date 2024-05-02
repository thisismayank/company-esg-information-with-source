const response = {
  APPLICATION_ERROR: {
    SERVER_ERROR: {
      success: false,
      version: 1,
      statusCode: "500_001",
      message: "Server error.",
      messageObj: {},
    },
    UNAUTHORIZED: {
      success: false,
      version: 1,
      statusCode: "500_002",
      message: "User is unauthorized.",
      messageObj: {},
    },
    MISSING_AUTH: {
      success: false,
      version: 1,
      statusCode: "500_001",
      message: "Request has no authorization.",
      messageObj: {},
    },
  },
  AUTH: {
    GENERATE_OTP: {
      EXISTING_USER: {
        SUCCESS: {
          success: true,
          version: 1,
          statusCode: "200_000_002",
          message: "User logged in successfully.",
          results: {},
        },
      },
      SEND_GENERATED_OTP: {
        SUCCESS: {
          success: true,
          version: 1,
          statusCode: "200_000_002",
          message: "OTP generated and sent successfully.",
          results: {},
        },
      },
    },
    VERIFY_OTP: {
      SUCCESS: {
        success: true,
        version: 1,
        statusCode: "200_000_001",
        message: "OTP verified successfully.",
        results: {},
      },
      LOG_IN: {
        success: true,
        version: 1,
        statusCode: "200_000_002",
        message: "OTP verified and user logged in successfully.",
        results: {},
      },
      FAILURE: {
        success: false,
        version: 1,
        statusCode: "500_000_003",
        message: "Wrong OTP.",
        messageObj: {},
      },
    },
    CREATE_NEW_USER: {
      SUCCESS: {
        success: true,
        version: 1,
        statusCode: "200_000_001",
        message: "User account created successfully.",
        results: {},
      },
      FAILURE: {
        success: false,
        version: 1,
        statusCode: "500_000_001",
        message: "Could not create a new account.",
        messageObj: {},
      },
    },
  },

  CARBON: {
    CNAUGHT: {
      PLACE_ORDER: {
        SUCCESS: {
          success: true,
          version: 1,
          statusCode: "200_000_010",
          message: "Order placed successfully",
          results: {},
        },
        FAILURE: {
          success: false,
          version: 1,
          statusCode: "500_000_010",
          message: "Some error occured in order placing.",
          messageObj: {},
        },
      },
    },
  },
  ESGER: {
    TEST: {
      SUCCESS: {
        success: true,
        version: 1,
        statusCode: "200_000_010",
        message: "Information retreived successfully",
        results: {},
      },
      FAILURE: {
        success: false,
        version: 1,
        statusCode: "500_000_010",
        message: "Some error occured in order placing.",
        messageObj: {},
      },
    },
  },
};

export default response;
