/**
 * Chuyển đổi thông báo lỗi từ tiếng Anh (kỹ thuật) sang tiếng Việt (thân thiện)
 */

// Map các lỗi phổ biến
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'Unauthorized': 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  'Invalid credentials': 'Email hoặc mật khẩu không đúng',
  'Invalid email or password': 'Email hoặc mật khẩu không đúng',
  'Email or password is incorrect': 'Email hoặc mật khẩu không đúng',
  'User not found': 'Không tìm thấy tài khoản này',
  'Account is locked': 'Tài khoản của bạn đã bị khóa',
  'Account is suspended': 'Tài khoản của bạn đã bị tạm ngưng',
  'Account is banned': 'Tài khoản của bạn đã bị cấm',
  'Account is pending approval': 'Tài khoản của bạn đang chờ phê duyệt từ quản trị viên',
  'Account has been rejected': 'Tài khoản của bạn đã bị từ chối',
  
  // Registration errors
  'Email already exists': 'Email này đã được đăng ký',
  'Username already exists': 'Tên đăng nhập này đã tồn tại',
  'Email already in use': 'Email này đã được sử dụng',
  'Username already in use': 'Tên đăng nhập này đã được sử dụng',
  'Invalid referral code': 'Mã giới thiệu không hợp lệ',
  'Referral code not found': 'Không tìm thấy mã giới thiệu',
  'Sponsor not found': 'Không tìm thấy người giới thiệu',
  'Sponsor is not active': 'Người giới thiệu chưa được kích hoạt',
  'Invalid email format': 'Định dạng email không hợp lệ',
  'Password too weak': 'Mật khẩu quá yếu',
  'Password must be at least 8 characters': 'Mật khẩu phải có ít nhất 8 ký tự',
  'Username must be at least 3 characters': 'Tên đăng nhập phải có ít nhất 3 ký tự',
  
  // Network errors
  'Network error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet',
  'Failed to fetch': 'Không thể kết nối đến máy chủ. Vui lòng thử lại',
  'Request timeout': 'Yêu cầu hết thời gian chờ. Vui lòng thử lại',
  'Unable to sign in': 'Không thể đăng nhập. Vui lòng thử lại',
  'Unable to register': 'Không thể đăng ký. Vui lòng thử lại',
  
  // Permission errors
  'Forbidden': 'Bạn không có quyền thực hiện thao tác này',
  'Access denied': 'Truy cập bị từ chối',
  'Insufficient permissions': 'Bạn không có đủ quyền',
  
  // Server errors
  'Internal server error': 'Lỗi hệ thống. Vui lòng thử lại sau',
  'Service unavailable': 'Hệ thống đang bảo trì. Vui lòng thử lại sau',
  'Bad gateway': 'Lỗi máy chủ. Vui lòng thử lại sau',
  'Gateway timeout': 'Máy chủ không phản hồi. Vui lòng thử lại sau',
  
  // Validation errors
  'Validation error': 'Dữ liệu không hợp lệ',
  'Invalid input': 'Thông tin nhập vào không hợp lệ',
  'Required field': 'Trường này là bắt buộc',
  'Invalid phone number': 'Số điện thoại không hợp lệ',
  
  // Token errors
  'Token expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
  'Invalid token': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại',
  'Token not found': 'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại',
  
  // Generic errors
  'Request failed': 'Yêu cầu thất bại. Vui lòng thử lại',
  'Something went wrong': 'Có lỗi xảy ra. Vui lòng thử lại',
  'An error occurred': 'Có lỗi xảy ra. Vui lòng thử lại',
  'Bad Request': 'Yêu cầu không hợp lệ',
  'Not Found': 'Không tìm thấy',
};

/**
 * Translate error message to Vietnamese
 */
export function translateError(error: string | unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'Có lỗi xảy ra. Vui lòng thử lại';
  }

  // Convert to string
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = String(error);
  }

  // Trim whitespace
  errorMessage = errorMessage.trim();

  // Check exact match first
  if (ERROR_MESSAGES[errorMessage]) {
    return ERROR_MESSAGES[errorMessage];
  }

  // Check case-insensitive match
  const lowerError = errorMessage.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (key.toLowerCase() === lowerError) {
      return value;
    }
  }

  // Check if error contains known patterns
  const patterns: [RegExp, string][] = [
    [/email.*already.*exist/i, 'Email này đã được đăng ký'],
    [/username.*already.*exist/i, 'Tên đăng nhập này đã tồn tại'],
    [/email.*already.*use/i, 'Email này đã được sử dụng'],
    [/username.*already.*use/i, 'Tên đăng nhập này đã được sử dụng'],
    [/invalid.*credential/i, 'Email hoặc mật khẩu không đúng'],
    [/invalid.*email.*password/i, 'Email hoặc mật khẩu không đúng'],
    [/unauthorized/i, 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn'],
    [/forbidden/i, 'Bạn không có quyền thực hiện thao tác này'],
    [/not.*found/i, 'Không tìm thấy'],
    [/referral.*code.*invalid/i, 'Mã giới thiệu không hợp lệ'],
    [/referral.*code.*not.*found/i, 'Không tìm thấy mã giới thiệu'],
    [/sponsor.*not.*found/i, 'Không tìm thấy người giới thiệu'],
    [/sponsor.*not.*active/i, 'Người giới thiệu chưa được kích hoạt'],
    [/account.*locked/i, 'Tài khoản của bạn đã bị khóa'],
    [/account.*suspended/i, 'Tài khoản của bạn đã bị tạm ngưng'],
    [/account.*banned/i, 'Tài khoản của bạn đã bị cấm'],
    [/account.*pending/i, 'Tài khoản của bạn đang chờ phê duyệt từ quản trị viên'],
    [/account.*rejected/i, 'Tài khoản của bạn đã bị từ chối'],
    [/password.*weak/i, 'Mật khẩu quá yếu'],
    [/password.*8.*character/i, 'Mật khẩu phải có ít nhất 8 ký tự'],
    [/network.*error/i, 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet'],
    [/failed.*fetch/i, 'Không thể kết nối đến máy chủ. Vui lòng thử lại'],
    [/timeout/i, 'Yêu cầu hết thời gian chờ. Vui lòng thử lại'],
    [/internal.*server/i, 'Lỗi hệ thống. Vui lòng thử lại sau'],
    [/service.*unavailable/i, 'Hệ thống đang bảo trì. Vui lòng thử lại sau'],
    [/token.*expired/i, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại'],
    [/invalid.*token/i, 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại'],
  ];

  for (const [pattern, translation] of patterns) {
    if (pattern.test(errorMessage)) {
      return translation;
    }
  }

  // If already in Vietnamese (contains Vietnamese characters), return as is
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(errorMessage)) {
    return errorMessage;
  }

  // Default fallback - return original message if no translation found
  // This allows backend Vietnamese messages to pass through
  return errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại sau';
}

/**
 * Translate validation errors (array)
 */
export function translateValidationErrors(errors: string[]): string[] {
  return errors.map(translateError);
}

/**
 * Get user-friendly error message for forms
 */
export function getFormErrorMessage(error: unknown): string {
  const translated = translateError(error);
  
  // Add icon and context for common scenarios
  if (translated.includes('Email hoặc mật khẩu không đúng')) {
    return '❌ ' + translated;
  }
  
  // Account pending approval - từ backend
  if (translated.includes('chờ phê duyệt') || translated.includes('chờ duyệt')) {
    return '⏳ ' + translated;
  }
  
  // Account locked/banned/suspended
  if (translated.includes('bị khóa') || translated.includes('bị cấm') || translated.includes('bị tạm ngưng') || translated.includes('bị vô hiệu hóa')) {
    return '🔒 ' + translated;
  }
  
  // Account rejected
  if (translated.includes('bị từ chối')) {
    return '❌ ' + translated;
  }
  
  // Registration errors
  if (translated.includes('đã được đăng ký') || translated.includes('đã tồn tại') || translated.includes('đã được sử dụng')) {
    return '⚠️ ' + translated;
  }
  
  // Referral code errors
  if (translated.includes('Mã giới thiệu')) {
    return '⚠️ ' + translated;
  }
  
  // Success messages (shouldn't happen in error, but just in case)
  if (translated.includes('thành công')) {
    return '✅ ' + translated;
  }
  
  return translated;
}

