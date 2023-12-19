process.env.NODE_ENV = 'test'

const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany;
let testInvoice1;
let testInvoice2;
let testIndustry1;
let testIndustry2;

beforeEach(async () => {
    /*
    Adds sample data to test. 
    */

    const companyResult = await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES('google', 'google', 'search engine')
        RETURNING code, name, description`
    )

    const invoiceResult1 = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES('google', 100, false, '2023-12-15', null)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`
    )

    const invoiceResult2 = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES('google', 10000, false, '2023-12-15', null)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`
    )

    const industryResult1 = await db.query(
        `INSERT INTO industries (ind_code, industry)
        VALUES('tech', 'technology')
        RETURNING ind_code, industry`
    )

    const industryResult2 = await db.query(
        `INSERT INTO industries (ind_code, industry)
        VALUES('retail', 'retail')
        RETURNING ind_code, industry`
    )
        
    testCompany = companyResult.rows[0];
    testInvoice1 = invoiceResult1.rows[0]
    testInvoice2 = invoiceResult2.rows[0]
    testIndustry1 = industryResult1.rows[0]
    testIndustry2 = industryResult2.rows[0]
})

afterEach(async () => {
    /*
    Deletes all tables in database. For invoice table, 
    restarts id count.
    */
    await db.query(`TRUNCATE TABLE invoices RESTART IDENTITY`)
    await db.query(`DELETE FROM companies_industries`)
    await db.query(`DELETE FROM companies`)
    await db.query(`DELETE FROM industries`)
    
})

afterAll(async() => {
    /* 
    Ends connection to database.
    */
    await db.end()
})

describe("GET /companies", () => {
    test("Get all companies in database", async () => {
        const res = await request(app).get('/companies')
        
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            companies: [{"code": testCompany.code, "name": testCompany.name}]})
    })
})

describe("GET /companies/:code", () => {
    test("Get one company from database", async () => {
        await db.query(
            `INSERT INTO companies_industries (company_code, industry_code)
            VALUES('google', 'tech')
            RETURNING company_code, industry_code`
        )
    
        await db.query(
            `INSERT INTO companies_industries (company_code, industry_code)
            VALUES('google', 'retail')
            RETURNING company_code, industry_code`
        )

        const res = await request(app).get(`/companies/${testCompany.code}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            company: {
                "code": testCompany.code
                , "name": testCompany.name
                , "description": testCompany.description
                , "invoices": [testInvoice1.id, testInvoice2.id]
                , "industry_codes": [testIndustry1.ind_code, testIndustry2.ind_code]
            }
        })
    })

    test("Test 404 error of invalid company", async () => {
        const res = await request(app).get(`/companies/invalidcode`)

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })
})

describe("POST /companies", () => {
    test("Create a single company", async() => {
        const res = await request(app).post(`/companies`).send({"code": "spotify", "name": "spotify", "description": "Music" })

        expect(res.statusCode).toBe(201)
        expect(res.body).toEqual({ company: { "code": "spotify", "name": "spotify", "description": "Music"}})
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).post(`/companies`).send({"description": "Music"})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })
})

describe("PUT /companies/:code", () => {
    test("Update information about company.", async() => {
        const res = await request(app).put(`/companies/${testCompany.code}`).send({"name": "microsoft", "description": "Tech Company"})

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({ company: { "code": testCompany.code, "name": "microsoft", "description": "Tech Company"}})
    })

    test("Test 404 error of invalid company", async () => {
        const res = await request(app).put(`/companies/invalidcode`).send({"name": "spotify", "description": "Music"})

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).put(`/companies/${testCompany.code}`).send({"description": "Music"})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })
})

describe("DELETE /companies/:code", () => {
    test("Deletes company. Checks to see that invoices and industry tags for company have been deleted.", async() => {
        const res = await request(app).delete(`/companies/${testCompany.code}`)

        const resCompanyInvoices = await db.query(
            `SELECT comp_code
            FROM invoices
            WHERE comp_code=$1`, [testCompany.code]
        )
        
        const resCompanyIndustries = await db.query(
            `SELECT company_code
            FROM companies_industries
            WHERE company_code=$1`, [testCompany.code]
        )
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({"status": "Deleted"})
        expect(resCompanyInvoices.rowCount).toEqual(0)
        expect(resCompanyIndustries.rowCount).toEqual(0)
    })

    test("Test 404 error of invalid company", async () => {
        const res = await request(app).delete(`/companies/invalidcode`)

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })
})