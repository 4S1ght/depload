# depload

A tiny wrapper on top of [dependency graph](https://www.npmjs.com/package/dependency-graph)
meant to load distinct services in the right order similarly to NestJS but without the heft
of an entire opinionated framework.

```ts
import DependencyLoadContext from 'depload'
const dl = new DependencyLoadContext()

class Service1 {
    static deps = []
    static name = 's1'
    constructor()       { console.log('Started S1') }
    async destructor()  { console.log('Stopped S1') }
    async initializer() { }
}

class Service2 {

    static deps = ['s1'] // Deps listed by the names defined in their "Service.name" prop.
    static name = 's2'
    private declare s1: InstanceType<Service1>

    constructor({ s1 }) { // Deps injected directly by their defined names.
        this.s1 = s1
        console.log('Started S2') 
    }

    async destructor()  { console.log('Stopped S2') }
    async initializer() { }

}

dl.registerService(Service1)
dl.registerService(Service2)

dl.start()
// > Started S1
// > Started S2

dl.stop()
// > Stopped S2
// > Stopped S1

```
