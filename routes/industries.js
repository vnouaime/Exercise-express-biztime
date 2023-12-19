const express = require("express");
const slugify = require("slugify")
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db")

router.get('/', async (req, res, next) => {
    /* 
    Returns all industries with companies that are associated with industry.
    */

    try {
        const results = await db.query(
            `SELECT industries.industry, companies.code
            FROM industries
            LEFT JOIN companies_industries ON industries.ind_code = companies_industries.industry_code
            LEFT JOIN companies ON companies_industries.company_code = companies.code;
            `
        );
     
        const industriesMap = new Map();

        results.rows.forEach(row => {
            const { industry, code } = row;

            if (!industriesMap.has(industry)) {
                industriesMap.set(industry, { industry, companies: [] });
            }

            if (code) {
                industriesMap.get(industry).companies.push(code);
            }
        });

        const industriesArray = [...industriesMap.values()];
        const responseObject = { industries: industriesArray };

        return res.json(responseObject);
    } catch (err) {
        return next (err)
    }  
})

router.post('/', async (req, res, next) => {
    /* 
    Creates new industry and returns it. 
    If there is missing data in the request, 400 error. 
    */

    try {
        const {name} = req.body;
        
        if (!name) {
            throw new ExpressError("Missing Data", 400);
        }
        
        const code = slugify(name, {
            lower: true, 
            strict: true
        })  
       
        const results = await db.query(
            `INSERT INTO companies (code, name) 
            VALUES ($1, $2)
            RETURNING code, name`, [code, name]
        );
        
        return res.status(201).json({industry: results.rows[0]}) 
        
    } catch (err) {
        return next(err)
    }
})

router.post('/addCompany', async (req, res, next) => {
    /*
    Creates a M:M relationship between industry and company. 
    If missing data, 400 error. 
    */

    try {
        if (!req.body.industry || !req.body.company) {
            throw new ExpressError("Missing Data", 400)
        } 
        
        const companyResult = await db.query(
            `SELECT code FROM companies
            WHERE name=$1`, [req.body.company]
        )

        const industryResult = await db.query(
            `SELECT ind_code FROM industries
            WHERE industry=$1`, [req.body.industry]
        )

        if (!companyResult.rows[0] || !industryResult.rows[0]){
            throw new ExpressError("Data Not Found", 404)
        }

        await db.query(
            `INSERT INTO companies_industries (company_code, industry_code)
            VALUES ($1, $2)
            RETURNING company_code, industry_code`, [companyResult.rows[0].code, industryResult.rows[0].ind_code]
        )

        return res.json({"status": "Relationship Added"})
    } catch (err) {
        return next(err)
    }
})

module.exports = router;