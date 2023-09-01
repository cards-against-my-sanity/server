import { Controller, Delete, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtRefreshTokenGuard } from './jwt-refresh-token/jwt-refresh-token.guard';
import { JwtAccessTokenGuard } from './jwt-access-token/jwt-access-token.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Req() req, @Res({ passthrough: true }) res) {
        const tokens = await this.authService.startSession(req.user.id, req.ip);
        res.cookie('refresh', tokens.refresh_token, { httpOnly: true, signed: true });

        return {
            access_token: tokens.access_token,
            permissions: req.user.permissions
        }
    }

    @Post('refresh')
    @UseGuards(JwtRefreshTokenGuard)
    async refresh(@Req() req, @Res({ passthrough: true }) res) {
        // req.user.id here is the session id (see JwtRefreshTokenStrategy)
        const tokens = await this.authService.refreshTokens(req.user.id);
        res.cookie('refresh', tokens.refresh_token, { httpOnly: true, signed: true });

        return {
            access_token: tokens.access_token
        };
    }

    @Delete('logout')
    @UseGuards(JwtAccessTokenGuard)
    async logOut(@Req() req, @Res({ passthrough: true }) res) {
        this.authService.endSession(req.user.sessionId);
        res.clearCookie('refresh');
    }
}
