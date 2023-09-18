import { Controller, Delete, Get, ParseBoolPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth/local-auth.guard';
import { Request, Response } from 'express';
import { IsAuthenticatedGuard } from './is-authenticated.guard';
import { SessionService } from 'src/session/session.service';
import IUser from 'src/shared-types/user/user.interface';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly sessionService: SessionService,
        private readonly configService: ConfigService
    ) { }

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Query('remember', ParseBoolPipe) remember: boolean = false): Promise<IUser> {
        const session = await this.sessionService.createSession(req.user, req.ip, remember);

        res.cookie(
            'sid',
            session.id,
            { 
                httpOnly: true, 
                secure: this.configService.get<string>("NODE_ENV") === 'production',
                signed: true, 
                sameSite: 'lax', 
                expires: session.expires
            }
        );

        return req.user;
    }

    @Delete('logout')
    @UseGuards(IsAuthenticatedGuard)
    async logOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
        this.sessionService.setExpiresNow(req.user.session_id);
        res.clearCookie('sid');
    }
}
