import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../src/models/productModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });


const fixProductFilters = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all products that are missing printingOption or deliverySpeed
        const products = await Product.find({
            $or: [
                { 'filters.printingOption': { $exists: false } },
                { 'filters.printingOption': { $size: 0 } },
                { 'filters.deliverySpeed': { $exists: false } },
                { 'filters.deliverySpeed': { $size: 0 } }
            ]
        });

        console.log(`\n📦 Found ${products.length} products with missing filters`);

        if (products.length === 0) {
            console.log('✅ All products already have printing options and delivery speeds configured');
            process.exit(0);
        }

        // Default values
        const defaultPrintingOptions = ['Single Side', 'Both Sides'];
        const defaultDeliverySpeeds = ['Standard', 'Express'];

        let updatedCount = 0;

        for (const product of products) {
            let updated = false;

            // Add default printing options if missing
            if (!product.filters.printingOption || product.filters.printingOption.length === 0) {
                product.filters.printingOption = defaultPrintingOptions;
                updated = true;
                console.log(`  ✏️  Added printing options to: ${product.name}`);
            }

            // Add default delivery speeds if missing
            if (!product.filters.deliverySpeed || product.filters.deliverySpeed.length === 0) {
                product.filters.deliverySpeed = defaultDeliverySpeeds;
                updated = true;
                console.log(`  ✏️  Added delivery speeds to: ${product.name}`);
            }

            if (updated) {
                await product.save();
                updatedCount++;
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} products`);
        console.log('\nDefault values added:');
        console.log(`  • Printing Options: ${defaultPrintingOptions.join(', ')}`);
        console.log(`  • Delivery Speeds: ${defaultDeliverySpeeds.join(', ')}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing product filters:', error);
        process.exit(1);
    }
};

fixProductFilters();
