const cds = require('@sap/cds');

async function bootstrap() {
    try {
        // Deploy database schema
        await cds.deploy();
        console.log('Database deployment completed');

        // Start the application
        await cds.server();
    } catch (err) {
        console.error('Failed to start application:', err);
        process.exit(1);
    }
}

bootstrap();