import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * First attempt authorization with JWT access token sent via Authorization bearer token;
 * failing that, fall back to anonymous authentication.
 */
@Injectable()
export class JwtAccessTokenWithAnonFallbackGuard extends AuthGuard(['jwt-access-token', 'anonymous']) {}