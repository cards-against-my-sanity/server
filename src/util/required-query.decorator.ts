import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common'

export const RequiredQuery = createParamDecorator(
    (key: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const value = request.query[key];
        
        if (value === undefined || value === null) {
            throw new BadRequestException(`Missing required query param: '${key}'`);
        }
        
        return value;
    }
)