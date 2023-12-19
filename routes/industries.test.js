process.env.NODE_ENV = 'test'

const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany1;
let testCompany2;
let testInvoice1;
let testInvoice2;
let testIndustry1;
let testIndustry2;

beforeEach(async () => {
    /*
    Adds sample data to test. 
    */

    const companyResult1 = await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES('google', 'google', 'search engine')
        RETURNING code, name, description`
    )

    const companyResult2 = await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES('bing', 'bing', 'search engine')
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
        
    testCompany1 = companyResult1.rows[0];
    testCompany2 = companyResult2.rows[0];
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

describe("GET /industries", () => {
    test("Get all industries in database", async () => {
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
        const res = await request(app).get('/industries')

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            industries: [{
                "industry": testIndustry1.industry
                , "companies": [testCompany1.name]
            },
            {
                "industry": testIndustry2.industry
                , "companies": [testCompany1.name]
            }]
        })
    })
})

describe("POST /industries", () => {
    test("Create a single industry", async() => {
        const res = await request(app).post(`/industries`).send({"name": "search engine"})

        console.log(res.body)
        expect(res.statusCode).toBe(201)
        expect(res.body).toEqual({ industry: { "code": "search-engine", "name": "search engine"}})
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).post(`/companies`).send({})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })
})

describe("POST /industries/addCompany", () => {
    test("Create a M:M relationship between industry and company", async() => {
        const res = await request(app).post(`/industries/addCompany`).send({"industry": "technology", "company": "bing"})

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({ "status": "Relationship Added"})
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).post(`/industries/addCompany`).send({})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })

    test("Test invalid industry name, resulting in 404 error", async() => {
        const res = await request(app).post(`/industries/addCompany`).send({"industry": "search engine", "company": "bing"})

        expect(res.statusCode).toBe(404)
        expect(res.body.error.message).toEqual("Data Not Found")
    })
})