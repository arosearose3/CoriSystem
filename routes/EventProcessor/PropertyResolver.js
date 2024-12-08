export class PropertyResolver {
    async resolveProperties(properties, context) {
        console.log('PropertyResolver: resolveProperties called');
        return false;
    }

    async resolveDynamicProperty(expression, context) {
        console.log('PropertyResolver: resolveDynamicProperty called');
        return false;
    }
}