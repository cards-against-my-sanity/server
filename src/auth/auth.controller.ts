import { Controller, Delete, Post, Req, Res, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtRefreshTokenGuard } from './jwt-refresh-token/jwt-refresh-token.guard';
import { Request, Response } from 'express';
import { IsAuthenticatedGuard } from './is-authenticated.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.startSession(req.user.id, req.ip);
        res.cookie('refresh', tokens.refresh_token, { httpOnly: true, signed: true });

        return {
            access_token: tokens.access_token,
            permissions: req.user.permissions
        }
    }

    @Post('refresh')
    @UseGuards(JwtRefreshTokenGuard)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.refreshTokens(req.user.session_id);
        res.cookie('refresh', tokens.refresh_token, { httpOnly: true, signed: true });

        return {
            access_token: tokens.access_token
        };
    }

    @Delete('logout')
    @UseGuards(IsAuthenticatedGuard)
    async logOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        this.authService.endSession(req.user.session_id);
        res.clearCookie('refresh');
    }
}
