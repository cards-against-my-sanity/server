import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class CookieAuthWithAnonFallbackGuard extends AuthGuard(['cookie', 'anonymous']) {}