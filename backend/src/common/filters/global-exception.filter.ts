import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const uploadCode = typeof exception === 'object' && exception !== null && 'code' in exception ? String((exception as { code?: unknown }).code || '') : '';
    const isUploadError = exception?.constructor?.name === 'MulterError' || uploadCode.startsWith('LIMIT_');
    const uploadMessage = uploadCode === 'LIMIT_FILE_SIZE'
      ? 'The selected file is too large.'
      : uploadCode === 'LIMIT_FILE_COUNT' || uploadCode === 'LIMIT_UNEXPECTED_FILE'
        ? 'Too many files or an unsupported upload field was sent.'
        : 'The selected file could not be uploaded.';
    const status = exception instanceof HttpException ? exception.getStatus() : isUploadError ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : isUploadError ? uploadMessage : 'Internal server error';
    const rawMessage = typeof payload === 'string' ? payload : (payload as { message?: string | string[] }).message ?? 'Something went wrong';
    const isProduction = String(process.env.NODE_ENV ?? '').toLowerCase() === 'production';
    const message = isProduction && status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : rawMessage;
    response.status(status).json({ success: false, message, statusCode: status });
  }
}
