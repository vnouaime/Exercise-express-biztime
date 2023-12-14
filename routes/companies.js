const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db")

router.get('/', async (req, res, next) => {
    /* 
    Returns all companies in database.
    */

    try {
        const results = await db.query(`SELECT code, name FROM companies`);

        return res.json({companies: results.rows}) 
    } catch (err) {
        return next (err)
    }
    
})

router.get('/:code', async (req, res, next) => {
    /*
    Returns data on company. If company not found, 404 error. 
    */ 

    try {
        const code = req.params.code
        const results = await db.query(
            `SELECT invoices.id, companies.code, companies.name, companies.description
            FROM invoices
            JOIN companies ON invoices.comp_code = companies.code
            WHERE code=$1`, [code]
        );

        if (results.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404)
        }

        return res.json({
            company: {
                code
                , name: results.rows[0].name
                , description: results.rows[0].description
                , invoices: 
                    results.rows.map(invoice => {
                        return invoice.id
                    })
            }
        })
    } catch (err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    /* 
    Creates new company and returns it.
    */

    try {
        const {code, name, description} = req.body;
        const results = await db.query(
            `INSERT INTO companies (code, name, description) 
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, [code, name, description]
        );

        return res.status(201).json({company: results.rows[0]}) 
    } catch (err) {
        return next(err)
    }
    
})

router.put('/:code', async (req, res, next) => {
    /*
    Edits information about company. If company not found, 404 error.
    */

    try {
        const { code } = req.params;
        const { name, description } = req.body;

        const results = await db.query(
            `UPDATE companies 
            SET name=$1, description=$2 
            WHERE code=$3
            RETURNING code, name, description`, [name, description, code]
        )

        if (results.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404)
        }

        return res.send({company: results.rows[0]})
    } catch (err) {
        return next(err)
    }
})

router.delete('/:code', async (req, res, next) => {
    /*
    Deletes a company. If company not found, 404 error.
    */

    try {
        const results = await db.query(
            `DELETE FROM companies 
            WHERE code = $1`, [req.params.code]
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