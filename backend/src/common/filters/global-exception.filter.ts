import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message = typeof payload === 'string' ? payload : (payload as { message?: string | string[] }).message ?? 'Something went wrong';
    response.status(status).json({ success: false, message, statusCode: status });
  }
}
