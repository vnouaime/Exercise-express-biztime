const express = require("express");
const slugify = require("slugify")
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
    Returns data on individual company. 
    If company not found, 404 error. 
    */ 

    try {
        const invoiceResults = await db.query(
            `SELECT companies.code, invoices.id
            FROM companies
            LEFT JOIN INVOICES ON companies.code = invoices.comp_code
            WHERE companies.code = $1`, [req.params.code]
        )

        const industryResults = await db.query(
            `SELECT companies.code, companies.name, companies.description, industries.ind_code
            FROM companies
            LEFT JOIN companies_industries ON companies.code = companies_industries.company_code
            LEFT JOIN industries ON companies_industries.industry_code = industries.ind_code 
            WHERE companies.code=$1`, [req.params.code]
        );
        
        if (invoiceResults.rowCount === 0) {
            throw new ExpressError("Page Not Found", 404)
        }

        let { code, name, description } = industryResults.rows[0]

        return res.json({
            company: {
                code
                , name
                , description
                , invoices: invoiceResults.rows.map(r => r.id)
                , industry_codes: industryResults.rows.map(r => r.ind_code)
            }
        })
    } catch (err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    /* 
    Creates new company and returns it. Code for company is slugified from name of company that user enters.
    If there is missing data in the request, 400 error. 
    */

    try {
        const {name, description} = req.body;
        
        if (!name || !description) {
            throw new ExpressError("Missing Data", 400);
        }
        
        const code = slugify(name, {
            lower: true, 
            strict: true
        })  
       
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
    Edits information about company. 
    If company not found, 404 error.
    If there is missing data, 400 error. 
    */

    try {
        const { code } = req.params;
        const { name, description } = req.body;

        if (name && description) {
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
        } else {
            throw new ExpressError("Missing Data", 400)
        }   
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
        return next(err)
    }
})

module.exports = router;