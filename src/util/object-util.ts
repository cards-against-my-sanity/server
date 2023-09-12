export class ObjectUtil {
    static notUndefOrNull(object?: any): boolean {
        return object !== undefined && object !== null;
    }
}