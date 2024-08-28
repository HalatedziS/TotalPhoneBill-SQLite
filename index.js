import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4011;

// Middleware
app.use(cors()); 
app.use(express.static('public')); 
app.use(express.json()); 

// Setup SQLite database
(async () => {
    let db;

    try {
        db = await open({
            filename: './database/data_plan.db',
            driver: sqlite3.Database
        });

        // Apply migrations
        await db.migrate({ migrationsPath: './migrations' });

        // Calculate total phone bill
        app.post('/api/phonebill', async (req, res) => {
            const { price_plan_id, actions } = req.body;
            console.log(req.body);
        
            if (!price_plan_id || !actions) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
        
            try {
                const plan = await db.get('SELECT * FROM price_plan WHERE id = ?', [Number(price_plan_id)]);
                console.log(plan);
              
                if (!plan) {
                    return res.status(400).json({ error: 'Price plan not found' });
                }
        
                const actionList = actions.split(',').map(action => action.trim().toLowerCase());
                let total = 0;
        
                actionList.forEach(action => {
                    if (action === 'call') total += plan.call_price;
                    if (action === 'sms') total += plan.sms_price;
                });
        
                res.json({ total: total.toFixed(2) });
            } catch (error) {
                console.error('Error calculating phone bill:', error);
                res.status(500).json({ error: 'Failed to calculate phone bill' });
            }
        });

        // Get all price plans
        app.get('/api/price_plans', async (req, res) => {
            try {
                const plans = await db.all('SELECT * FROM price_plan');
                res.json(plans);
            } catch (error) {
                console.error('Error retrieving price plans:', error);
                res.status(500).json({ error: 'Failed to retrieve price plans' });
            }
        });

        // Create a new price plan
        app.post('/api/price_plan/create', async (req, res) => {
            const { name, call_cost, sms_cost } = req.body;
            if (!name || call_cost === undefined || sms_cost === undefined) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            try {
                await db.run('INSERT INTO price_plan (plan_name, call_price, sms_price) VALUES (?, ?, ?)', [name, call_cost, sms_cost]);
                res.status(201).json({ message: 'Price plan created successfully' });
            } catch (error) {
                console.error('Error creating price plan:', error);
                res.status(500).json({ error: 'Failed to create price plan' });
            }
        });

        // Update a price plan
        app.put('/api/price_plan/update', async (req, res) => {
            const { name, call_cost, sms_cost } = req.body;
            
            if (!name || call_cost === undefined || sms_cost === undefined) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            try {
                console.log({ name, call_cost, sms_cost });
                const result = await db.run('UPDATE price_plan SET call_price = ?, sms_price = ? WHERE plan_name = ?', [call_cost, sms_cost, name]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Price plan not found' });
                }
                res.json({ message: 'Price plan updated successfully' });
            } catch (error) {
                console.error('Error updating price plan:', error);
                res.status(500).json({ error: 'Failed to update price plan' });
            }
        });

        // Delete a price plan
        app.delete('/api/price_plan/delete', async (req, res) => {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ error: 'Missing price plan ID' });
            }

            try {
                const result = await db.run('DELETE FROM price_plan WHERE id = ?', [id]);
                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Price plan not found' });
                }
                res.json({ message: 'Price plan deleted successfully' });
            } catch (error) {
                console.error('Error deleting price plan:', error);
                res.status(500).json({ error: 'Failed to delete price plan' });
            }
        });

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });

    } catch (error) {
        console.error('Error setting up the database:', error);
        process.exit(1);
    }
})();
