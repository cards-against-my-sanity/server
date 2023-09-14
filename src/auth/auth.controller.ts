import { Controller, Delete, Post, Req, Res, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth/local-auth.guard';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { IsAuthenticatedGuard } from './is-authenticated.guard';
import { IUser } from 'src/shared-types/user/user.interface';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<IUser> {
        res.cookie(
            'sid',
            await this.authService.startSession(req.user, req.ip),
            { httpOnly: true, signed: true }
        );

        return req.user;
    }

    @Post('validate_session')
    async validateSession(@Req() req: Request): Promise<Record<string, boolean>> {
        if (!req.signedCookies.sid) {
            return { valid: false }
        }

        return { valid: await this.authService.validateSession(req.signedCookies.sid) }
    }

    @Delete('logout')
    @UseGuards(IsAuthenticatedGuard)
    async logOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
        this.authService.endSession(req.user.session_id);
        res.clearCookie('sid');
    }
}
