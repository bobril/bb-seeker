using System;
using System.Collections.Generic;
using System.Linq;
using System.Collections.ObjectModel;
using System.Drawing;

using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using NUnit.Framework;

using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Firefox;

using System.IO;

namespace BBSeeker.Tests
{

    public static class WebDriverExtensionsCustom
    {

        public static string RootPath { get { return Directory.GetParent(Path.GetDirectoryName(Path.GetDirectoryName(TestContext.Curr‌​entContext.WorkDirectory))).FullName; } }
        public static string DriverPath { get { return RootPath + @"\bin\Debug\netcoreapp3.0"; } }

        public static readonly string DriverKey = "driver";


        /// <summary>
        /// Rozsireni standard FindElement ze Selenia.
        /// Hleda element po urceny cas pote ho vrati, nebo vrati null
        /// </summary>
        /// <param name="by">metoda hledani</param>
        /// <param name = "timeout" >Nastaveni hodnoty timeoutu v sekundach.</param>
        /// <param name="displayed">True pokud musi byt element zaroven viditelny.</param>
        /// <returns>Nalezeny element, nebo null.</returns>
        /// 
        public static IWebElement FindElementBy(this IWebDriver driver, By by, uint timeout, bool displayed = true)
        {
            var wait = new DefaultWait<ISearchContext>(driver)
            {
                Timeout = TimeSpan.FromSeconds(timeout)
            };

            //ignoruje vyjimky kdy tam element neni
            wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
            return wait.Until(ctx =>
            {
                var elem = ctx.FindElement(by);
                if (displayed && !elem.Displayed)
                    return null;

                return elem;
            });
        }

        /// <summary>
        /// Rozsireni standard IsElementPresent ze Selenia.
        /// Hleda element a vraci true - pokud existuje, nebo false v opacnem pripade
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="by"></param>
        /// <param name="displayed"></param>
        /// <returns></returns>
        public static bool IsElementPresent(this IWebDriver driver, string bbSeekerSearchExpression, bool displayed = true)
        {
            try
            {
                IWebElement element = driver.FindElementWithTimeout(bbSeekerSearchExpression);
                return IsElementPresent(driver, element, displayed);
            }
            catch (TimeoutException)
            {
                return false;
            }                     
        }

        //temporary, will be removed after standard method is changed to NOT wait and tests updated so that they don't fail (can't do it due to release being close)
        public static bool IsElementPresentNoWait(this IWebDriver driver, string bbSeekerSearchExpression, bool displayed = true)
        {
            try
            {
                IWebElement element = driver.FindElement(bbSeekerSearchExpression);
                return IsElementPresent(driver, element, displayed);
            }
            catch (TimeoutException)
            {
                return false;
            }
        }

        private static bool IsElementPresent(this IWebDriver driver, IWebElement element, bool displayed = true)
        {
            try
            {
                if (element == null)
                {
                    return false;
                }
                if (displayed)
                {
                    return element.Displayed;
                }
                return true;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        /// <summary>
        /// Metoda ceka dokud je prvek viditelný, nebo existuje.
        /// Pouziti napriklad pri cekani na refresch stránky po delete programu
        /// </summary>
        /// <param name="by">dle ceho hledat</param>
        /// <param name="timeout">Nastaveni hodnoty timeoutu v sekundach.</param>
        /// 
        public static void WaitForElementInvisibleOrNotExist(this IWebDriver driver, By by, uint timeout = 2)
        {
            WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeout));
            wait.Until(ExpectedConditions.InvisibilityOfElementLocated(by));
            wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
            wait.Until((d) =>
            {
                try
                {
                    IWebElement element = d.FindElement(by);
                    return !element.Displayed;
                }
                catch (NoSuchElementException)
                {
                    //If the find fails, the element exists, and
                    // by definition, cannot then be visible.
                    return true;
                }
            });
        }
        /// <summary>
        /// Waits for exact count of elements, timeout in seconds, default timeout is 3 seconds
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="timeoutSeconds"></param>
        /// <param name="locator"></param>
        /// <param name="count"></param>
        public static void WaitForElementsCount(this IWebDriver driver, string locator, uint count, uint timeoutSeconds = 2)
        {
            var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeoutSeconds));
            wait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
            wait.Until((IWebDriver drv) =>
            {
                return driver.FindElementsWithTimeout(locator).Count == count;
            });
        }

        /// <summary>
        /// Click on an element defined with an XPath expression.
        /// </summary>
        /// <param name="xPath">XPath expression for selecting the element</param>
        /// <param name="notFoundMessage">Message to be displayed if the element is not found</param>
        /// <param name="timeout">Optional parameter for overriding timeout defined in the config file</param>
        public static void ClickElementWithXPath(this IWebDriver driver, string xPath, string notFoundMessage, uint timeout = 2)
        {
            try
            {
                driver.FindElementBy(By.XPath(xPath), timeout).Click();
            }
            catch (Exception e)
            {
                Assert.IsTrue(false, notFoundMessage + ": " + e.ToString());
            }
        }

        public static bool IsElementPresentBy(this IWebDriver driver, By xPath, bool displayed = true)
        {
            try
            {
                return driver.IsElementPresent(driver.FindElement(xPath), displayed);
            }
            catch (NoSuchElementException)
            {
                return false;// odchytava NoSuchElementException z FindElement
            }
        }

        public static void SwitchToBrowserTabWithIndex(this IWebDriver driver, int index)
        {
            WaitForNumberOfTabsEqualOrGreater(driver, index + 1);
            ICollection<string> windowsHandles = null;
            windowsHandles = driver.WindowHandles;
            driver.SwitchTo().Window(windowsHandles.ElementAt(index));
        }

        public static void WaitForNumberOfTabsEqualOrGreater(this IWebDriver driver, int number)
        {
            var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(5));
            wait.Until((IWebDriver drv) =>
            {               
                return driver.WindowHandles.Count == number;
            });
        }

        public static void CloseTab(this IWebDriver driver, int index)
        {
            ICollection<string> windowsHandles = null;
            windowsHandles = driver.WindowHandles;
            driver.SwitchTo().Window(windowsHandles.ElementAt(index)).Close();
        }

        public static void RefreshPage(this IWebDriver driver,double timoutInSecounds = 10) {
            driver.Navigate().GoToUrl(driver.Url);
            IWait<IWebDriver> wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timoutInSecounds));
            wait.Until(driver1 => ((IJavaScriptExecutor)driver).ExecuteScript("return document.readyState").Equals("complete"));
        }

        /// <summary>
        /// Opens a new browser tab/window and navigates to a provided URL
        /// </summary>
        /// <param name="url">URL to open</param>
        /// 
        public static void OpenNewBrowserTab(this IWebDriver driver, string url)
        {
            driver.FindElement(By.CssSelector("body")).SendKeys(Keys.Control + "n");
            System.Threading.Thread.Sleep(1000);
            ReadOnlyCollection<string> handles = driver.WindowHandles;
            driver.SwitchTo().Window(handles[1]);
            driver.Navigate().GoToUrl(url);
            //Assert.IsTrue(driver.IsElementPresent(By.XPath("//body")), "Wait for HTML body to show up");
            driver.Manage().Window.Maximize();
            driver.Manage().Window.Size = new Size(1936, 1176);
        }

        public static void StaleReferenceProtected(this IWebDriver driver, Action<IWebDriver> method, uint timeout)
        {
            var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeout));
            wait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
            wait.Until((IWebDriver drv) =>
            {
                method(drv);
                return true;
            });
        }

        public static IWebDriver InitDriver(string browserName, Boolean headless = false)
        {
            switch (browserName)
            {
                case "chrome":
                    //ChromeOptions options = new ChromeOptions();
                    //options.AddArgument("start-maximized");
                    //options.AddArgument("window-size=1920,1080");
                   ChromeOptions options = new ChromeOptions();
                    if (headless)
                    {
                        options.AddArgument("headless");
                        options.AddArgument("disable-gpu");
                        options.AddArgument("window-size=1920,1080");
                    }
                    //options.AddUserProfilePreference("download.default_directory", TestConfig.TmpPath);
                    return new ChromeDriver(DriverPath, options);
                //return new RemoteWebDriver(new Uri("http://127.0.0.1:9515"), DesiredCapabilities.Chrome());
                case "firefox":
                    //FirefoxDriverService service = FirefoxDriverService.CreateDefaultService();
                    //service.FirefoxBinaryPath = @"C:\Program Files (x86)\Mozilla Firefox\firefox.exe";
                    //return new FirefoxDriver(service);
                    return new FirefoxDriver(new FirefoxOptions());
                default:
                    throw new ArgumentException("Error initializing webdriver. Unrecognized option: " + browserName);
            }
        }

    }
}
