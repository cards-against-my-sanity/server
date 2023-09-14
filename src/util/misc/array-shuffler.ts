export class ArrayShuffler {
    /**
     * Shuffles the given array in-place using the Fisher-Yates
     * shuffle.
     * 
     * See: https://stackoverflow.com/a/2450976
     * 
     * @param array the array to shuffle
     * @returns the array, now shuffled
     */
    static shuffle<T>(array: Array<T>) {
        let currentIndex = array.length;
        let randomIndex: number;

        // While there remain elements to shuffle.
        while (currentIndex > 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = 
                [array[randomIndex], array[currentIndex]];
        }
    }
}