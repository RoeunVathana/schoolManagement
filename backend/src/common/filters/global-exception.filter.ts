import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { requestId?: string }>();
    const uploadCode = typeof exception === 'object' && exception !== null && 'code' in exception ? String((exception as { code?: unknown }).code || '') : '';
    const isUploadError = exception?.constructor?.name === 'MulterError' || uploadCode.startsWith('LIMIT_');
    const isPayloadTooLarge = uploadCode === 'LIMIT_REQUEST_BODY' || uploadCode === 'entity.too.large' || (exception instanceof Error && exception.name === 'PayloadTooLargeError');
    const isMalformedJson = exception instanceof SyntaxError && 'body' in exception;
    const uploadMessage = uploadCode === 'LIMIT_FILE_SIZE'
      ? 'The selected file is too large.'
      : uploadCode === 'LIMIT_FILE_COUNT' || uploadCode === 'LIMIT_UNEXPECTED_FILE'
        ? 'Too many files or an unsupported upload field was sent.'
        : 'The selected file could not be uploaded.';
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : isPayloadTooLarge
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : isMalformedJson || isUploadError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException
      ? exception.getResponse()
      : isPayloadTooLarge
        ? 'Request body is too large.'
        : isMalformedJson
          ? 'The request body contains invalid JSON.'
          : isUploadError
            ? uploadMessage
            : 'Internal server error';
    const rawMessage = typeof payload === 'string' ? payload : (payload as { message?: string | string[] }).message ?? 'Something went wrong';
    const isProduction = String(process.env.NODE_ENV ?? '').toLowerCase() === 'production';
    // Keep controlled 502/503 messages useful to clients (for example, when
    // the optional code runner is down), while still hiding unexpected 500
    // details in production.
    const message = isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : rawMessage;
    const requestId = request.requestId || request.header('x-request-id') || undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(`${request.method} ${request.originalUrl || request.url} failed (${status})${requestId ? ` [${requestId}]` : ''}: ${errorMessage}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({ success: false, message, statusCode: status, ...(requestId ? { requestId } : {}) });
  }
}
