import { test, expect } from 'vitest'
import DepLoad from '../src/main.js'

test('Depload', async () => {

    const x = new DepLoad({
        circular: true
    })

    const constructors: string[] = []
    const initializers: string[] = []
    const destructors: string[] = []

    class Test1 {
        static deps = []
        static name = 'test1'
        constructor()       { constructors.push('test1'); console.log('test1') }
        async initializer() { initializers.push('test1') }
        async destructor()  { destructors.push('test1')  }
    }

    class Test2 {
        static deps = ['test1']
        static name = 'test2'
        constructor()       { constructors.push('test2'); console.log('test2') }
        async initializer() { initializers.push('test2') }
        async destructor()  { destructors.push('test2')  }
    }

    type Test3Deps = { test1: InstanceType<typeof Test1>, test2: InstanceType<typeof Test2> }
    let test3Deps: Test3Deps

    class Test3 {
        static deps = ['test2', 'test1']
        static name = 'test3'
        constructor(deps: Test3Deps)       { constructors.push('test3'), test3Deps = deps }
        async initializer()                { initializers.push('test3') }
        async destructor()                 { destructors.push('test3')  }
    }

    x.registerService(Test3)
    x.registerService(Test1)
    x.registerService(Test2)

    await x.start()
    expect(constructors).toEqual(['test1', 'test2', 'test3'])
    expect(initializers).toEqual(['test1', 'test2', 'test3'])
    expect(destructors).toEqual([])

    // @ts-ignore
    expect(test3Deps).toEqual({ test1: x.instances.get('test1')!, test2: x.instances.get('test2')! })

    await x.stop()
    expect(destructors).toEqual(['test3', 'test2', 'test1'])

})
