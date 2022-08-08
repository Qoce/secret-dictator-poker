let MersenneTwister = require('mersenne-twister');

let rng = {
  generator: new MersenneTwister(),

  setSeed(n: number){
    this.generator = new MersenneTwister(n)
  },
  
  nextInt(max: number){
    return this.generator.random_int() % max
  },

  randomize(arr: any[]){
    for(let i = 0; i < arr.length * 20; i++){
      let a = this.nextInt(arr.length)
      let b = this.nextInt(arr.length)
      let temp = arr[b]
      arr[b] = arr[a]
      arr[a] = temp
    }
  }
}

export default rng