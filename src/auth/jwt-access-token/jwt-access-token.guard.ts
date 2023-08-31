import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * First attempt authorization with JWT access token sent via Authorization bearer token.
 */
@Injectable()
export class JwtAccessTokenGuard extends AuthGuard(['jwt-access-token']) {}