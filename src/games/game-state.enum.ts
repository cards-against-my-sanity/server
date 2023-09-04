/**
 * Lobby->Dealing->Playing->Judging->{Dealing, Win}
 * Win->Reset->Lobby
 * 
 * Abandoned is a special state indicating the game
 * host has left the game.
 */
export enum GameState {
    Lobby,
    Dealing,
    Playing,
    Judging,
    Win,
    Reset,
    Abandoned
}