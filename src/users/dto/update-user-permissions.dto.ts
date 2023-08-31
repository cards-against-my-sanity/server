import { IsNumber, IsOptional } from "class-validator";

export class UpdateUserPermissionsDto {
    @IsNumber()
    @IsOptional()
    generic_permissions: number;

    @IsNumber()
    @IsOptional()
    gameplay_permissions: number;

    @IsNumber()
    @IsOptional()
    contributor_permissions: number;

    @IsNumber()
    @IsOptional()
    moderator_permissions: number;

    @IsNumber()
    @IsOptional()
    admin_permissions: number;
}
