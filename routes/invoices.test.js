process.env.NODE_ENV = 'test'

const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany;
let testInvoice1;
let testInvoice2

let today = new Date()
let add_date = today.toISOString()

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
        VALUES('google', 100, false, '${add_date}', null)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`
    )

    const invoiceResult2 = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES('google', 10000, false, '${add_date}', null)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`
    )
        
    testCompany = companyResult.rows[0];
    testInvoice1 = invoiceResult1.rows[0]
    testInvoice2 = invoiceResult2.rows[0]
})

afterEach(async () => {
    /* 
    Deletes all tables in database. For invoice table, 
    restarts id count.
    */
    await db.query(`TRUNCATE TABLE invoices RESTART IDENTITY`)
    await db.query(`DELETE FROM companies`)
})

afterAll(async() => {
    /* 
    Ends connection to database.
    */
    await db.end()
})

describe("GET /invoices", () => {
    test("Get all invoices in database", async () => {
        const res = await request(app).get('/invoices')
        
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            invoices: [
                { id: expect.any(Number), comp_code: testInvoice1.comp_code }, 
                { id: expect.any(Number), comp_code: testInvoice2.comp_code }
            ]
        })
    })
})

describe("GET /invoices/:id", () => {
    test("Get one invoice from database", async () => {
        const res = await request(app).get(`/invoices/${testInvoice1.id}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            invoice: {
                id: testInvoice1.id
                , amt: testInvoice1.amt
                , paid: testInvoice1.paid
                , add_date: testInvoice1.add_date.toISOString()
                , paid_date: testInvoice1.paid_date
                , company: {
                    code: 'google', 
                    name: 'google', 
                    description: 'search engine' 
                }
            }
        })
    })

    test("Test 404 error of invalid invoice", async () => {
        const res = await request(app).get(`/invoices/0`)

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })
})

describe("POST /invoices", () => {
    test("Create a single invoice", async() => {
        const res = await request(app).post(`/invoices`).send({"comp_code": "google", "amt": 1000 })

        expect(res.statusCode).toBe(201)
        expect(res.body).toEqual({ 
            invoice: {
                id: expect.any(Number)
                , amt: 1000
                , paid: false
                , add_date: res.body.invoice.add_date // dynamic variable of today's date given in response of body
                , paid_date: null
                , comp_code: "google"
            }
        })
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).post(`/invoices`).send({"comp_code": "google"})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })
})

describe("PUT /invoices/:id", () => {
    test("Update information about invoice.", async() => {
        const res = await request(app).put(`/invoices/${testInvoice1.id}`).send({"amt": 2000, "paid": 500})

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            invoice: {
                id: testInvoice1.id
                , amt: 1500
                , paid: testInvoice1.paid
                , add_date: testInvoice1.add_date.toISOString()
                , paid_date: testInvoice1.add_date.toISOString()
                , comp_code: testInvoice1.comp_code
            }
        })
    })

    test("Test 404 error of invalid invoice", async () => {
        const res = await request(app).get(`/invoices/0`)

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })

    test("Test missing data, resulting in 400 error", async() => {
        const res = await request(app).put(`/invoices/${testInvoice1.id}`).send({})

        expect(res.statusCode).toBe(400)
        expect(res.body.error.message).toEqual("Missing Data")
    })
})

describe("DELETE /invoices/:id", () => {
    test("Deletes Invoice", async() => {
        const res = await request(app).delete(`/invoices/${testInvoice1.id}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({"status": "Deleted"})
    })

    test("Test 404 error of invalid company", async () => {
        const res = await request(app).delete(`/invoices/0`)

        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toEqual("Page Not Found")
    })
})