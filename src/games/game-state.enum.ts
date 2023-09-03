/**
 * Lobby->Dealing->Playing->Judging->{Dealing, Win}
 * Win->Reset->Lobby
 */
export enum GameState {
    Lobby,
    Dealing,
    Playing,
    Judging,
    Win,
    Reset
}