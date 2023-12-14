const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db")

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
    */

    try {
        const today = new Date()
        const add_date = today.toISOString().split('T')[0];
        const paid = false;
        const paid_date = null;

        
        const {comp_code, amt} = req.body;
        const results = await db.query(
            `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt, paid, add_date, paid_date]
        );

        return res.status(201).json({invoice: results.rows[0]}) 
    } catch (err) {
        return next(err)
    }
    
})

router.put('/:id', async (req, res, next) => {
    /*
    Edits amt of invoice. If invoice not found, 404 error. 
    */

    try {
        const { id } = req.params;
        const { amt } = req.body;

        const fetchQuery = await db.query(
            `SELECT id, amt, paid, add_date, paid_date
            FROM invoices
            WHERE id=$1`, [id]
        );
    
        if (fetchQuery.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404);
        }
    
        const existingInvoice = fetchQuery.rows[0];
    
        const results = await db.query(
            `UPDATE invoices 
            SET amt=$1
            WHERE id=$2
            RETURNING id, amt, paid, add_date, paid_date`, [amt, id]
        )

        return res.send({invoice: { 
            id
            , comp_code: existingInvoice.comp_code
            , amt
            , paid: existingInvoice.paid
            , add_date: existingInvoice.add_date
            , paid_date: existingInvoice.paid_date
        }})
    } catch (err) {
        return next(err)
    }
})

router.delete('/:id', async (req, res, next) => {
    /*
    Deletes invoice. If invoice not found, 404 error. 
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