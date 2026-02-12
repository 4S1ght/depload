// Imports =============================================================================================================

import dg from 'dependency-graph'

// Types ===============================================================================================================

export interface ServiceInstance {

    /**
     * If available on the service's instance, the `initializer` method will get called after the `constructor`.
     * This second optional step can be used to perform any async initialization logic like connecting to a database
     * or reading files, as well as receiving injected dependencies.
     * @returns 
     */
    readonly initializer?: () => void | Promise<void>

    /**
     * Called whenever the service is destroyed.  
     * Used to perform cleanup tasks like closing database connections or open file handles.
     * @returns 
     */
    readonly destructor?: () => void | Promise<void>

}

export interface Service {

    new(deps: any): ServiceInstance

    /**
     * Names of each service that this service depends on.
     */
    readonly deps: string[]

    /**
     * The name given to this service which can later be used inside the `deps` array of other services
     * to mark this one as a dependency.
     */
    readonly name: string

}

export type OperatingStatus = 'standby' | 'initializing' | 'running' | 'stopping' | 'stopped'

// /** Object containing the instances of all dependencies of the service assigned by their `name`'s. */
// type InjectedDeps = Record<string, ServiceInstance>

// Exports =============================================================================================================

export default class DependencyLoadContext {

    private instances = new Map<string, ServiceInstance>()
    private graph: dg.DepGraph<Service>

    public status: OperatingStatus = 'standby'

    constructor(opts?: dg.Options) {
        this.graph = new dg.DepGraph<Service>(opts)
    }

    public registerService(service: Service) {

        if (service.name === 'placeholder') {
            throw new Error('Can not register a "placeholder" service. The name is used internally.')
        }

        const node = this.getNodeData(service.name)

        if (node) {
            if (node.name === 'placeholder') this.graph.setNodeData(service.name, service)
            else throw new Error(`Can not register service ${node.name} twice.`)
        }
        else {
            this.graph.addNode(service.name, service)
        }

        for (const depName of service.deps) {
            const dep = this.getNodeData(depName)
            if (!dep) this.graph.addNode(depName, Placeholder)
            this.graph.addDependency(service.name, depName)
        }

    }

    public async start() {

        this.status = 'initializing'

        for (const name of this.graph.overallOrder()) {

            const Service = this.getNodeData(name)!

            const deps = Service.deps.reduce<Record<string, ServiceInstance>>((acc, depName) => {
                acc[depName] = this.instances.get(depName)!
                return acc
            }, {})

            const instance = new Service(deps)
            if (instance.initializer) await instance.initializer()

            this.instances.set(name, instance)
        }

        this.status = 'running'
    }

    public async stop() {

        if (['stopping', 'stopped'].includes(this.status)) return

        this.status = 'stopping'

        for (const name of this.graph.overallOrder().reverse()) {
            const instance = this.instances.get(name)
            if (!instance) continue
            if (instance.destructor) await instance.destructor()
            this.instances.delete(name)
        }

        this.status = 'stopped'

    }

    // Helpers

    private getNodeData(name: string) {
        try   { return this.graph.getNodeData(name) } 
        catch { return undefined }
    }


}

// Placeholder service =================================================================================================

const Placeholder: Service = class implements ServiceInstance {
    static deps = []
    static name = 'placeholder'
    constructor()       { throw new Error('Can not instantiate a placeholder service.') }
    async initializer() { throw new Error('Can not instantiate a placeholder service.') }
    async destructor()  { throw new Error('Can not instantiate a placeholder service.') }
}