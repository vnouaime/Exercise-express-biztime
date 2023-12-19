const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db")

// Date object for add_date and paid_date
const today = new Date()
const add_date = today.toISOString()

router.get('/', async (req, res, next) => {
    /* 
    Returns all invoices in database. 
    */

    try {
        const results = await db.query(`SELECT id, comp_code FROM invoices`);

        return res.json({invoices: results.rows}) 
    } catch (err) {
        return next (err)
    }
    
})

router.get('/:id', async (req, res, next) => {
    /*
    Returns data about invoice. If invoice not found, 404 error. 
    */ 

    try {
        const id = req.params.id
        const results = await db.query(
            `SELECT invoices.id, invoices.comp_code, invoices.amt, invoices.paid, invoices.add_date, invoices.paid_date,
            companies.code, companies.name, companies.description
            FROM invoices
            JOIN companies ON invoices.comp_code = companies.code
            WHERE id=$1`, [id]
        );

        if (results.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404)
        }

        return res.json({invoice: {
            id: results.rows[0].id 
            , amt: results.rows[0].amt
            , paid: results.rows[0].paid
            , add_date: results.rows[0].add_date
            , paid_date: results.rows[0].paid_date 
            , company: {
                code: results.rows[0].code
                , name: results.rows[0].name
                , description: results.rows[0].description
            }
        }})
    } catch (err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    /* 
    Creates new invoice and returns it.
    If data is missing, 400 error. 
    */

    try {
        const paid = false;
        const paid_date = null;
        
        const {comp_code, amt} = req.body;

        if (comp_code && amt) {
            const results = await db.query(
                `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) 
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt, paid, add_date, paid_date]
            );

            return res.status(201).json({invoice: results.rows[0]}) 
        } else {
            throw new ExpressError("Missing Data", 400)
        }
        
    } catch (err) {
        return next(err)
    }
    
})

router.put('/:id', async (req, res, next) => {
    /*
    Edits amt of invoice. 
    If invoice not found, 404 error.
    If there is missing data, 400 error. 
    */

    try {
        const { id } = req.params;
        const { amt, paid } = req.body;
        let amt_remaining = amt - paid;
        
        let date;
        let stat_paid = false;

        if (!amt || !paid ) {
            throw new ExpressError("Missing Data", 400)
        } 

        if (amt_remaining === 0) {
            // In data.sql, there is a constraint to not allow amt to be 0. 
            amt_remaining = 0.01 
            stat_paid = true;
        }
        
        const fetchQuery = await db.query(
            `SELECT id, amt, paid, add_date, paid_date, comp_code
            FROM invoices
            WHERE id=$1`, [id]
        );
    
        if (fetchQuery.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404);
        }

        if (paid > 0) {
            date = add_date
           
        } else if (paid < 0) {
            date = null
        } else {
            date = fetchQuery.rows[0].paid_date
        }

        const results = await db.query(
            `UPDATE invoices 
            SET amt=$1, paid=$2, paid_date=$3
            WHERE id=$4
            RETURNING id, amt, paid, add_date, paid_date, comp_code`, 
            [amt_remaining, stat_paid, date, id]
        )

        return res.send({invoice: results.rows[0]})   
    } catch (err) {
        return next(err)
    }
})

router.delete('/:id', async (req, res, next) => {
    /*
    Deletes invoice.
    If invoice not found, 404 error. 
    */

    try {
        const results = await db.query(
            `DELETE FROM invoices
            WHERE id = $1`, [req.params.id]
        )

        if (results.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404)
        }

        return res.send({status: "Deleted"})
    } catch (err) {
        next (err)
    }
})

module.exports = router;