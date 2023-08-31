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
        return this.sendTokens(res, await this.authService.startSession(req.user.id, req.ip));
    }

    @Post('refresh')
    @UseGuards(JwtRefreshTokenGuard)
    async refresh(@Req() req, @Res({ passthrough: true }) res) {
        // req.user.id here is the session id (see JwtRefreshTokenStrategy)
        return this.sendTokens(res, await this.authService.refreshTokens(req.user.id));
    }

    @Delete('logout')
    @UseGuards(JwtAccessTokenGuard)
    async logOut(@Req() req, @Res({ passthrough: true }) res) {
        this.authService.endSession(req.user.sessionId);
        res.clearCookie('refresh');
    }

    private sendTokens(res, tokens) {
        res.cookie('refresh', tokens.refresh_token, { httpOnly: true, signed: true });
        return { access_token: tokens.access_token };
    }
}
